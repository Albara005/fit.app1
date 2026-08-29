import { describe, expect, it } from 'vitest'
import { adapt } from '../../lib/plan/adapt'
import { buildTemplatePlan } from '../../lib/plan/engine'
import { makeProfile } from '../factories'
import type { CheckIn } from '../../lib/types'

const day = () => buildTemplatePlan(makeProfile({ daysPerWeek: 4 })).days[0]!
const checkIn = (over: Partial<CheckIn> = {}): CheckIn => ({
  date: '2026-08-29', sleepHours: 7.5, energy: 4, soreness: 2, stress: 2, minutesAvailable: 90, ...over,
})
const sets = (d: ReturnType<typeof day>) => d.exercises.reduce((n, x) => n + x.sets, 0)

describe('daily adaptation', () => {
  it('leaves a good day alone and says so', () => {
    const a = adapt(day(), checkIn())
    expect(a.codes).toEqual(['NO_CHANGE'])
    expect(a.setsDelta).toBe(0)
    expect(a.line.ar).toContain('زي ما هو')
  })

  it('drops volume on short sleep and names the hours', () => {
    const a = adapt(day(), checkIn({ sleepHours: 5 }))
    expect(a.codes).toContain('SLEEP_DEBT')
    expect(a.setsDelta).toBeLessThan(0)
    expect(a.line.ar).toContain('5')
  })

  it('eases intensity on low energy', () => {
    const base = day()
    const a = adapt(base, checkIn({ energy: 1 }))
    expect(a.codes).toContain('LOW_ENERGY')
    expect(a.day.exercises[0]!.rpe).toBeLessThan(base.exercises[0]!.rpe)
  })

  it('does not double-cut volume when sleep and energy are both bad', () => {
    const short = adapt(day(), checkIn({ sleepHours: 5 }))
    const both = adapt(day(), checkIn({ sleepHours: 5, energy: 1 }))
    expect(both.setsDelta).toBe(short.setsDelta)
  })

  it('lowers intensity for soreness and for stress', () => {
    expect(adapt(day(), checkIn({ soreness: 5 })).codes).toContain('HIGH_SORENESS')
    expect(adapt(day(), checkIn({ stress: 5 })).codes).toContain('HIGH_STRESS')
  })

  it('never drops a lift below two sets', () => {
    const a = adapt(day(), checkIn({ sleepHours: 4, energy: 1, soreness: 5, stress: 5 }))
    for (const ex of a.day.exercises) expect(ex.sets).toBeGreaterThanOrEqual(2)
  })

  it('never eases RPE below 5', () => {
    const a = adapt(day(), checkIn({ energy: 1, soreness: 5, stress: 5 }))
    for (const ex of a.day.exercises) expect(ex.rpe).toBeGreaterThanOrEqual(5)
  })

  it('fits the session into the time available, keeping the main lifts', () => {
    const base = day()
    const a = adapt(base, checkIn({ minutesAvailable: 30 }))
    expect(a.codes).toContain('SHORT_ON_TIME')
    expect(a.day.estMinutes).toBeLessThanOrEqual(30)
    expect(a.day.exercises.length).toBeGreaterThanOrEqual(2)
    expect(a.day.exercises[0]!.id).toBe(base.exercises[0]!.id)
    expect(a.line.ar).toContain('30')
  })

  it('adds a set when everything says green', () => {
    const a = adapt(day(), checkIn({ energy: 5, sleepHours: 8, soreness: 1, minutesAvailable: 0 }))
    expect(a.codes).toContain('GREEN_LIGHT')
    expect(a.setsDelta).toBe(1)
  })

  it('does not green-light a well-rested but stressed day', () => {
    const a = adapt(day(), checkIn({ energy: 5, sleepHours: 8, soreness: 1, stress: 5 }))
    expect(a.codes).not.toContain('GREEN_LIGHT')
  })

  it('leads with one reason, not a list', () => {
    const a = adapt(day(), checkIn({ sleepHours: 4, energy: 1, soreness: 5, stress: 5, minutesAvailable: 25 }))
    expect(a.codes.length).toBeGreaterThan(1)
    expect(a.line.ar).toContain('نمت')
    expect(a.line.en).not.toContain('•')
  })

  it('gives every code a line in both languages', () => {
    const cases: CheckIn[] = [
      checkIn(), checkIn({ sleepHours: 5 }), checkIn({ energy: 1 }), checkIn({ soreness: 5 }),
      checkIn({ stress: 5 }), checkIn({ minutesAvailable: 20 }),
      checkIn({ energy: 5, sleepHours: 8, soreness: 1, minutesAvailable: 0 }),
    ]
    for (const c of cases) {
      const a = adapt(day(), c)
      expect(a.line.ar.length).toBeGreaterThan(10)
      expect(a.line.en.length).toBeGreaterThan(10)
    }
  })
})
