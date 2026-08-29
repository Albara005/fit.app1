import { describe, expect, it } from 'vitest'
import { bmi, bmr, deriveProfile, nutritionTarget, tdee } from '../../lib/plan/nutrition'
import { gate } from '../../lib/safety/gate'
import { makePlan, makeProfile } from '../factories'
import type { ActivityLevel, Goal, Sex } from '../../lib/types'

describe('body metrics', () => {
  it('computes BMI to one decimal', () => {
    expect(bmi(85, 175)).toBe(27.8)
  })

  it('uses Mifflin-St Jeor with the sex constant', () => {
    const base = { weightKg: 80, heightCm: 180, age: 30 } as const
    expect(bmr({ ...base, sex: 'm' })).toBe(1780)
    expect(bmr({ ...base, sex: 'f' })).toBe(1614)
  })

  it('scales TDEE by activity', () => {
    const p = { weightKg: 80, heightCm: 180, age: 30, sex: 'm' } as const
    expect(tdee({ ...p, activity: 'sedentary' })).toBeLessThan(tdee({ ...p, activity: 'very_active' }))
  })
})

describe('nutritionTarget', () => {
  it('creates a deficit for a cut and a surplus for a gain', () => {
    expect(nutritionTarget(makeProfile({ goal: 'cut' })).deficit).toBeGreaterThan(0)
    expect(nutritionTarget(makeProfile({ goal: 'gain' })).deficit).toBeLessThan(0)
  })

  it('reports no weekly loss target when there is no deficit', () => {
    expect(nutritionTarget(makeProfile({ goal: 'gain' })).weeklyLossTargetKg).toBe(0)
  })

  it('never drops a woman below 1200 kcal', () => {
    const t = nutritionTarget(makeProfile({ sex: 'f', weightKg: 45, heightCm: 150, age: 55, activity: 'sedentary', goal: 'cut' }))
    expect(t.kcal).toBeGreaterThanOrEqual(1200)
  })

  it('caps protein against a BMI-30 reference weight', () => {
    const heavy = nutritionTarget(makeProfile({ weightKg: 140, heightCm: 170 }))
    const cap = 2.0 * 30 * 1.7 ** 2
    expect(heavy.protein).toBeLessThanOrEqual(Math.round(cap))
  })

  it('keeps macros within a few kcal of the calorie target', () => {
    const t = nutritionTarget(makeProfile())
    const fromMacros = t.protein * 4 + t.carbs * 4 + t.fat * 9
    expect(Math.abs(fromMacros - t.kcal)).toBeLessThanOrEqual(6)
  })
})

describe('the engine never produces a plan its own gate would reject', () => {
  const sexes: Sex[] = ['m', 'f']
  const goals: Goal[] = ['cut', 'recomp', 'gain', 'strength']
  const activities: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'very_active']

  it('holds across the whole profile space', () => {
    const failures: string[] = []
    for (const sex of sexes) {
      for (const goal of goals) {
        for (const activity of activities) {
          for (const age of [18, 30, 45, 65]) {
            for (const weightKg of [45, 60, 85, 120, 160]) {
              for (const heightCm of [150, 165, 180, 195]) {
                const profile = deriveProfile({
                  ...makeProfile(),
                  sex, goal, activity, age, weightKg, heightCm,
                })
                const nutrition = nutritionTarget(profile)
                const verdict = gate(makePlan({ nutrition }), profile).verdict
                // OFFER_ALTERNATIVE is a legitimate outcome for an underweight cut.
                if (verdict !== 'PASS' && verdict !== 'OFFER_ALTERNATIVE') {
                  failures.push(`${sex}/${goal}/${activity}/${age}/${weightKg}/${heightCm} → ${verdict}`)
                }
              }
            }
          }
        }
      }
    }
    expect(failures).toEqual([])
  })
})
