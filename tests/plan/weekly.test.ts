import { describe, expect, it } from 'vitest'
import { reviewWeek, trendFit, weeklyLine, weightTrend, type WeekLog } from '../../lib/plan/weekly'
import { gate } from '../../lib/safety/gate'
import { makeProfile } from '../factories'

const log = (over: Partial<WeekLog> = {}): WeekLog => ({
  weekIndex: 0, sessionsPlanned: 4, sessionsCompleted: 4, checkIns: [],
  weightsKg: [85, 84.8, 84.6, 84.4], ...over,
})

describe('weightTrend', () => {
  it('needs at least three weigh-ins', () => {
    expect(weightTrend([85, 84])).toBeNull()
  })

  it('fits a slope rather than subtracting endpoints', () => {
    // A noisy first reading must not decide the week.
    const trend = weightTrend([86, 84.6, 84.4, 84.2, 84.1])
    expect(trend).not.toBeNull()
    expect(trend!).toBeLessThan(0)
  })

  it('returns zero for a flat week', () => {
    expect(weightTrend([84, 84, 84, 84])).toBe(0)
  })

  it('reads the change across the span, not per weigh-in', () => {
    // Four readings spanning a week that fell 0.6 kg: the answer is 0.6, not 1.4.
    expect(weightTrend([85, 84.8, 84.6, 84.4])).toBeCloseTo(-0.6, 5)
    // Same week, weighed daily. Same answer.
    expect(weightTrend([85, 84.9, 84.8, 84.7, 84.6, 84.5, 84.4])).toBeCloseTo(-0.6, 5)
  })
})

describe('trendFit', () => {
  it('needs three readings, as the review does', () => {
    expect(trendFit([80, 79.8])).toBeNull()
  })

  it('passes through a perfectly straight series', () => {
    const fit = trendFit([80, 79.8, 79.6, 79.4])!
    expect(fit.intercept).toBeCloseTo(80, 10)
    expect(fit.slope).toBeCloseTo(-0.2, 10)
  })

  it('is the line weightTrend reads: its rise across the span is the trend', () => {
    // The chart draws trendFit; the review decides from weightTrend. If these
    // ever disagree, the chart explains a decision the coach did not make.
    const readings = [85, 84.6, 84.9, 84.3, 84.4, 84.0]
    const fit = trendFit(readings)!
    const across = fit.slope * (readings.length - 1)
    expect(across).toBeCloseTo(weightTrend(readings)!, 10)
  })
})

describe('weeklyLine', () => {
  it('spans the readings and rises by exactly the trend the review acts on', () => {
    const readings = [85, 84.6, 84.9, 84.3, 84.4, 84.0]
    const line = weeklyLine(readings)!
    expect(line.from.at).toBe(0)
    expect(line.to.at).toBe(readings.length - 1)
    expect(line.to.kg - line.from.kg).toBeCloseTo(weightTrend(readings)!, 10)
  })
})

describe('weekly review', () => {
  it('cuts the week down after poor adherence', () => {
    const r = reviewWeek(makeProfile({ daysPerWeek: 5 }), log({ sessionsCompleted: 1 }))
    expect(r.codes).toContain('LOW_ADHERENCE')
    expect(r.nextProfile.daysPerWeek).toBe(4)
    expect(r.cards[1]!.body.ar).toContain('4')
  })

  it('says a weight that did not move held steady, not that it rose by 0 kg', () => {
    const r = reviewWeek(makeProfile(), log({ weightsKg: [78, 78, 78, 78, 78] }))
    expect(r.weeklyChangeKg).toBe(0)
    expect(r.cards[0]!.body.ar).toContain('ووزنك ثابت')
    expect(r.cards[0]!.body.en).toContain('held steady')
    expect(r.cards[0]!.body.ar).not.toContain('0 كجم')
  })

  it('counts two days in the dual, not as "2 أيام"', () => {
    const r = reviewWeek(makeProfile({ daysPerWeek: 3 }), log({ sessionsCompleted: 0 }))
    expect(r.nextProfile.daysPerWeek).toBe(2)
    expect(r.cards[1]!.body.ar).toContain('يومين')
    expect(r.cards[1]!.body.ar).not.toContain('2 أيام')
  })

  it('never drops below two days a week', () => {
    const r = reviewWeek(makeProfile({ daysPerWeek: 2 }), log({ sessionsCompleted: 0 }))
    expect(r.nextProfile.daysPerWeek).toBe(2)
  })

  it('lowers calories when a cut stalls', () => {
    const r = reviewWeek(makeProfile({ goal: 'cut' }), log({ weightsKg: [85, 85, 85, 85.1] }))
    expect(r.codes).toContain('STALLED')
    expect(r.nextPlan.nutrition.kcal).toBeLessThan(r.nextProfile.tdee)
  })

  it('raises calories when weight falls too fast', () => {
    const r = reviewWeek(makeProfile({ goal: 'cut' }), log({ weightsKg: [85, 84.2, 83.4, 82.6] }))
    expect(r.codes).toContain('LOSING_TOO_FAST')
    expect(r.cards[1]!.body.ar).toContain('رفعت')
  })

  it('leaves an on-track week alone', () => {
    const r = reviewWeek(makeProfile({ goal: 'cut' }), log())
    expect(r.codes).toContain('ON_TRACK')
    expect(r.cards[1]!.body.ar).toContain('ما غيّرت')
  })

  it('asks for weigh-ins instead of guessing', () => {
    const r = reviewWeek(makeProfile(), log({ weightsKg: [85] }))
    expect(r.codes).toContain('NOT_ENOUGH_DATA')
    expect(r.cards[0]!.body.ar).toContain('سجّل وزنك')
  })

  it('carries the latest weight into the next week', () => {
    const r = reviewWeek(makeProfile({ weightKg: 85 }), log({ weightsKg: [85, 84.5, 84, 83.5] }))
    expect(r.nextProfile.weightKg).toBe(83.5)
  })

  it('always returns the three cards', () => {
    const r = reviewWeek(makeProfile(), log())
    expect(r.cards.map((c) => c.key)).toEqual(['happened', 'changed', 'new'])
    for (const card of r.cards) {
      expect(card.title.ar.length).toBeGreaterThan(0)
      expect(card.body.en.length).toBeGreaterThan(0)
    }
  })

  it('produces a next plan that passes the gate, however the week went', () => {
    const weeks: WeekLog[] = [
      log(), log({ sessionsCompleted: 0 }), log({ weightsKg: [85, 85, 85, 85] }),
      log({ weightsKg: [85, 83.8, 82.6, 81.4] }), log({ weightsKg: [] }),
    ]
    for (const goal of ['cut', 'recomp', 'gain', 'strength'] as const) {
      for (const w of weeks) {
        const r = reviewWeek(makeProfile({ goal, allergies: ['sesame', 'dairy'] }), w)
        const verdict = gate(r.nextPlan, r.nextProfile).verdict
        expect(verdict, `${goal}/${JSON.stringify(w.weightsKg)}`).toBe('PASS')
      }
    }
  })
})
