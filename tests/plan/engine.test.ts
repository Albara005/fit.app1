import { describe, expect, it } from 'vitest'
import { buildTemplatePlan } from '../../lib/plan/engine'
import { deriveProfile } from '../../lib/plan/nutrition'
import { allIngredients, gate } from '../../lib/safety/gate'
import { blockedPatterns } from '../../lib/safety/patterns'
import { matchIngredient, type AllergenId } from '../../lib/safety/allergens'
import { makeProfile } from '../factories'
import type { DietaryId, Goal, InjuryId, Profile } from '../../lib/types'

const ALL_ALLERGENS: AllergenId[] = [
  'sesame', 'dairy', 'gluten', 'treenut', 'peanut', 'egg', 'shellfish', 'fish', 'soy',
]
const ALL_INJURIES: InjuryId[] = [
  'lower_back', 'knee', 'shoulder', 'neck', 'wrist', 'elbow', 'ankle', 'hip', 'hernia',
]

describe('template plan shape', () => {
  it('produces one workout per training day', () => {
    for (const daysPerWeek of [1, 2, 3, 4, 5, 6]) {
      const plan = buildTemplatePlan(makeProfile({ daysPerWeek }))
      expect(plan.days).toHaveLength(daysPerWeek)
    }
  })

  it('caps the week at six training days', () => {
    expect(buildTemplatePlan(makeProfile({ daysPerWeek: 7 })).days).toHaveLength(6)
  })

  it('gives every day at least four exercises with a full gym', () => {
    const plan = buildTemplatePlan(makeProfile({ daysPerWeek: 5 }))
    for (const day of plan.days) expect(day.exercises.length).toBeGreaterThanOrEqual(4)
  })

  it('still builds a session with no equipment at all', () => {
    const plan = buildTemplatePlan(makeProfile({ equipment: [], daysPerWeek: 3 }))
    for (const day of plan.days) expect(day.exercises.length).toBeGreaterThanOrEqual(3)
  })

  it('never repeats an exercise within a day', () => {
    const plan = buildTemplatePlan(makeProfile({ daysPerWeek: 6 }))
    for (const day of plan.days) {
      expect(new Set(day.exercises.map((x) => x.id)).size).toBe(day.exercises.length)
    }
  })

  it('is reproducible for the same profile and week', () => {
    const a = buildTemplatePlan(makeProfile(), 3)
    const b = buildTemplatePlan(makeProfile(), 3)
    expect(a.days).toEqual(b.days)
    expect(a.meals).toEqual(b.meals)
  })

  it('adds volume as the weeks go on, then stops', () => {
    const sets = (w: number) =>
      buildTemplatePlan(makeProfile(), w).days[0]!.exercises[0]!.sets
    expect(sets(4)).toBeGreaterThan(sets(0))
    expect(sets(8)).toBeGreaterThan(sets(4))
    expect(sets(20)).toBe(sets(8))
  })

  it('builds four meals a day', () => {
    const plan = buildTemplatePlan(makeProfile())
    expect(plan.meals.map((m) => m.slot)).toEqual(['breakfast', 'lunch', 'dinner', 'snack'])
    for (const meal of plan.meals) expect(meal.items.length).toBeGreaterThan(0)
  })

  it('lands within 15% of the calorie target', () => {
    const profile = makeProfile()
    const plan = buildTemplatePlan(profile)
    const total = plan.meals.flatMap((m) => m.items).reduce((k, i) => k + i.kcal, 0)
    expect(Math.abs(total - plan.nutrition.kcal) / plan.nutrition.kcal).toBeLessThan(0.15)
  })
})

describe('the template plan never trips its own gate', () => {
  const goals: Goal[] = ['cut', 'recomp', 'gain', 'strength']

  it('passes for every single allergy', () => {
    for (const allergy of ALL_ALLERGENS) {
      for (const goal of goals) {
        const profile = makeProfile({ allergies: [allergy], goal })
        const result = gate(buildTemplatePlan(profile), profile)
        expect(result.verdict, `${allergy}/${goal}: ${JSON.stringify(result.reasons)}`).toBe('PASS')
      }
    }
  })

  it('passes with every allergy at once', () => {
    const profile = makeProfile({ allergies: ALL_ALLERGENS })
    const result = gate(buildTemplatePlan(profile), profile)
    expect(result.verdict, JSON.stringify(result.reasons)).toBe('PASS')
  })

  it('passes for every single injury', () => {
    for (const injury of ALL_INJURIES) {
      const profile = makeProfile({ injuries: [injury] })
      const result = gate(buildTemplatePlan(profile), profile)
      expect(result.verdict, injury).toBe('PASS')
      // The engine already excluded the pattern, so the gate has nothing to fix.
      expect(result.substitutions, injury).toEqual([])
    }
  })

  it('passes with every injury at once and still returns exercises', () => {
    const profile = makeProfile({ injuries: ALL_INJURIES })
    const plan = buildTemplatePlan(profile)
    expect(gate(plan, profile).verdict).toBe('PASS')
    const blocked = blockedPatterns(ALL_INJURIES)
    for (const day of plan.days) {
      expect(day.exercises.length).toBeGreaterThan(0)
      for (const ex of day.exercises) expect(blocked.has(ex.pattern)).toBe(false)
    }
  })

  it('passes across diets, ages, sexes and body sizes', () => {
    const diets: DietaryId[][] = [
      ['halal'], ['halal', 'vegetarian'], ['halal', 'vegan'],
      ['halal', 'no_red_meat'], ['halal', 'low_carb'], ['halal', 'diabetic'],
    ]
    const failures: string[] = []
    for (const dietary of diets) {
      for (const goal of goals) {
        for (const sex of ['m', 'f'] as const) {
          for (const [weightKg, heightCm, age] of [[55, 160, 22], [85, 175, 35], [130, 182, 50]] as const) {
            const profile = deriveProfile({
              ...(makeProfile() as Profile), dietary, goal, sex, weightKg, heightCm, age,
            })
            const result = gate(buildTemplatePlan(profile), profile)
            if (result.verdict !== 'PASS' && result.verdict !== 'OFFER_ALTERNATIVE') {
              failures.push(`${dietary.join('+')}/${goal}/${sex}/${weightKg} → ${result.verdict} ${JSON.stringify(result.reasons)}`)
            }
          }
        }
      }
    }
    expect(failures).toEqual([])
  })

  it('serves a vegan nothing derived from an animal', () => {
    const profile = makeProfile({ dietary: ['halal', 'vegan'] })
    const plan = buildTemplatePlan(profile)
    const animal: AllergenId[] = ['dairy', 'egg', 'fish', 'shellfish']
    for (const ref of allIngredients(plan)) {
      expect(matchIngredient(ref.ingredient, animal), ref.ingredient).toEqual([])
    }
  })
})
