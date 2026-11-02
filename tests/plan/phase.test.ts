import { describe, expect, it } from 'vitest'
import { buildTemplatePlan } from '../../lib/plan/engine'
import { phaseChangeKg, phaseLine, reportValue, reviewPhase, shareText, type PhaseInput } from '../../lib/plan/phase'
import { gate } from '../../lib/safety/gate'
import { makeProfile } from '../factories'
import type { CheckIn } from '../../lib/types'

const checkIn = (over: Partial<CheckIn> = {}): CheckIn => ({
  date: '2026-08-29', sleepHours: 7, energy: 4, soreness: 2, stress: 2, minutesAvailable: 60, ...over,
})

const input = (over: Partial<PhaseInput> = {}): PhaseInput => ({
  profile: makeProfile({ goal: 'cut', weightKg: 90, heightCm: 175 }),
  sessionsPerWeek: [4, 4, 3, 4, 4, 4],
  plannedPerWeek: 4,
  weightsKg: [90, 89.6, 89.1, 88.7, 88.2, 87.8, 87.4, 87.1],
  checkIns: [checkIn(), checkIn({ energy: 3 })],
  ...over,
})

describe('phaseChangeKg', () => {
  it('needs enough weigh-ins to mean anything', () => {
    expect(phaseChangeKg([90, 89, 88])).toBeNull()
  })

  it('averages the ends so one bad morning cannot flip the verdict', () => {
    const steady = [90, 89.8, 89.6, 89.4, 89.2, 89]
    const withSpike = [92.5, 89.8, 89.6, 89.4, 89.2, 89]
    // The spike moves the answer, but nowhere near the 2.5 kg a raw
    // first-to-last subtraction would have reported.
    expect(Math.abs(phaseChangeKg(withSpike)! - phaseChangeKg(steady)!)).toBeLessThan(1)
  })
})

describe('phase review — when it refuses to decide', () => {
  it('says so before six weeks', () => {
    const r = reviewPhase(input({ sessionsPerWeek: [4, 4, 4, 4] }))
    expect(r.decision).toBe('TOO_EARLY')
    expect(r.suggestedGoal).toBeNull()
    expect(r.detail.ar).toContain('6')
  })

  it('decides at exactly six weeks', () => {
    expect(reviewPhase(input()).decision).not.toBe('TOO_EARLY')
  })
})

describe('phase review — safety outranks progress', () => {
  it('ends a cut that has taken 8% of body weight off', () => {
    const r = reviewPhase(input({ weightsKg: [90, 88, 86, 85, 84, 83, 82.5, 82] }))
    expect(r.decision).toBe('MAINTAIN_BREAK')
    expect(r.suggestedGoal).toBe('recomp')
  })

  it('ends a cut that has brought BMI down to 20', () => {
    const r = reviewPhase(
      input({
        profile: makeProfile({ goal: 'cut', weightKg: 63, heightCm: 175 }),
        weightsKg: [63, 62.6, 62.2, 61.8, 61.4, 61.2, 61, 60.9],
      }),
    )
    expect(r.decision).toBe('MAINTAIN_BREAK')
  })

  it('outranks poor adherence', () => {
    const r = reviewPhase(
      input({ sessionsPerWeek: [0, 1, 0, 1, 0, 0], weightsKg: [90, 88, 86, 85, 84, 83, 82.5, 82] }),
    )
    expect(r.decision).toBe('MAINTAIN_BREAK')
  })

  it('leaves a gaining phase alone at the same weight change', () => {
    const r = reviewPhase(
      input({ profile: makeProfile({ goal: 'gain' }), weightsKg: [80, 81, 82, 83, 84, 85, 86, 87] }),
    )
    expect(r.decision).toBe('CONTINUE')
  })
})

describe('phase review — a plan nobody follows is the wrong plan', () => {
  it('changes the goal below 50% adherence', () => {
    const r = reviewPhase(input({ sessionsPerWeek: [1, 0, 2, 1, 0, 1] }))
    expect(r.decision).toBe('CHANGE_GOAL')
    expect(r.suggestedGoal).toBe('recomp')
    expect(r.detail.ar).toContain('%')
  })

  it('never proposes a cut to someone the gate would refuse one', () => {
    const r = reviewPhase(
      input({
        profile: makeProfile({ goal: 'strength', weightKg: 52, heightCm: 180 }),
        sessionsPerWeek: [0, 0, 1, 0, 0, 1],
        weightsKg: [52, 52, 52, 52, 52, 52, 52, 52],
      }),
    )
    expect(r.suggestedGoal).not.toBe('cut')
  })

  it('keeps going when the person is showing up', () => {
    const r = reviewPhase(input())
    expect(r.decision).toBe('CONTINUE')
    expect(r.suggestedGoal).toBeNull()
  })

  it('asks for weigh-ins rather than inventing a trend', () => {
    const r = reviewPhase(input({ weightsKg: [90] }))
    expect(r.decision).toBe('CONTINUE')
    expect(r.totalChangeKg).toBeNull()
    expect(r.detail.ar).toContain('سجّل وزنك')
  })
})

describe('every suggested goal survives the gate', () => {
  it('holds across decisions', () => {
    const cases: PhaseInput[] = [
      input(),
      input({ sessionsPerWeek: [0, 0, 0, 1, 0, 0] }),
      input({ weightsKg: [90, 88, 86, 85, 84, 83, 82.5, 82] }),
      input({ profile: makeProfile({ goal: 'gain' }) }),
      input({ profile: makeProfile({ goal: 'strength' }), sessionsPerWeek: [0, 1, 0, 0, 1, 0] }),
    ]
    for (const c of cases) {
      const review = reviewPhase(c)
      if (!review.suggestedGoal) continue
      const next = { ...c.profile, goal: review.suggestedGoal }
      expect(gate(buildTemplatePlan(next, 0), next).verdict, review.decision).toBe('PASS')
    }
  })
})

describe('the report leaves the app', () => {
  it('carries every line in the chosen language', () => {
    const review = reviewPhase(input())
    const text = shareText(review, 'ar')
    for (const line of review.report) expect(text).toContain(line.label.ar)
    expect(text).toContain(review.headline.ar)
    expect(shareText(review, 'en')).toContain('Adherence')
  })

  it('shows a dash rather than a fake number when weigh-ins are missing', () => {
    const review = reviewPhase(input({ weightsKg: [] }))
    expect(review.report.find((l) => l.key === 'weight')?.value).toBe('—')
  })

  it('labels every line in both languages', () => {
    for (const line of reviewPhase(input()).report) {
      expect(line.label.ar.length).toBeGreaterThan(0)
      expect(line.label.en.length).toBeGreaterThan(0)
    }
  })
})

const visible = (text: string) => text.replace(/[\u2066\u2069]/g, '')

describe('report units', () => {
  it('renders every unit in the reader’s language', () => {
    const review = reviewPhase(input())
    const weight = review.report.find((l) => l.key === 'weight')!
    expect(visible(reportValue(weight, 'ar'))).toContain('كجم')
    expect(visible(reportValue(weight, 'en'))).toContain('kg')
    // The raw value never carries a hard-coded unit of its own.
    expect(weight.value).not.toMatch(/[a-zA-Zء-ي]/)
  })

  it('appends nothing to a line that has no unit', () => {
    const bmiLine = reviewPhase(input()).report.find((l) => l.key === 'bmi')!
    expect(visible(reportValue(bmiLine, 'ar'))).toBe(bmiLine.value)
  })

  it('carries the localised units into the shared text', () => {
    expect(visible(shareText(reviewPhase(input()), 'ar'))).toContain('كجم')
    expect(visible(shareText(reviewPhase(input()), 'ar'))).not.toContain(' kg')
  })
})

describe('Arabic number agreement', () => {
  it('never suffixes a counted noun that would need to agree', () => {
    // "7 أسبوع" is wrong; 3-10 take the plural. Counted nouns live in labels.
    for (const weeks of [2, 3, 7, 10, 11, 20]) {
      const review = reviewPhase(input({ sessionsPerWeek: Array(weeks).fill(4) }))
      for (const line of review.report) {
        expect(visible(reportValue(line, 'ar')), `${weeks}w/${line.key}`).not.toMatch(/\d+\s*أسبوع$/)
      }
    }
  })
})

describe('phaseLine', () => {
  const weights = [86, 85.6, 86.1, 85.2, 84.9, 85.0, 84.4, 84.1]

  it('is the comparison the verdict is made on', () => {
    // A chart of the phase draws this line; it must rise or fall by exactly the
    // change the verdict reports, or the picture contradicts the decision.
    const line = phaseLine(weights)!
    expect(Math.round((line.to.kg - line.from.kg) * 100) / 100).toBe(phaseChangeKg(weights))
  })

  it('places each end at the centre of its window', () => {
    const line = phaseLine(weights)!
    expect(line.from.at).toBe(1) // readings 0–2
    expect(line.to.at).toBe(6) // readings 5–7
  })

  it('needs four readings, as the verdict does', () => {
    expect(phaseLine([86, 85, 84])).toBeNull()
  })
})
