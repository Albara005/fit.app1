import { describe, expect, it } from 'vitest'
import { reviewWeek, weightTrend, type WeekLog } from '../../lib/plan/weekly'
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

describe('weekly review', () => {
  it('cuts the week down after poor adherence', () => {
    const r = reviewWeek(makeProfile({ daysPerWeek: 5 }), log({ sessionsCompleted: 1 }))
    expect(r.codes).toContain('LOW_ADHERENCE')
    expect(r.nextProfile.daysPerWeek).toBe(4)
    expect(r.cards[1]!.body.ar).toContain('4')
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
