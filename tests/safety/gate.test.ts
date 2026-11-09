import { describe, expect, it } from 'vitest'
import { allIngredients, gate } from '../../lib/safety/gate'
import { makeDay, makeExercise, makeItem, makeMeal, makePlan, makeProfile } from '../factories'

describe('gate — allergies outrank everything', () => {
  it('rejects the meal when a derivative slips into an ingredient list', () => {
    const plan = makePlan({
      meals: [makeMeal({ items: [makeItem({ ingredients: ['دجاج', 'طحينة', 'ليمون'] })] })],
    })
    const result = gate(plan, makeProfile({ allergies: ['sesame'] }))

    expect(result.verdict).toBe('REJECT_MEAL')
    expect(result.reasons[0]).toMatchObject({
      code: 'ALLERGEN',
      allergen: 'sesame',
      matchKind: 'derivative',
      mealId: 'meal-1',
    })
  })

  it('rejects on the dish name alone when the ingredient list omits the allergen', () => {
    const plan = makePlan({
      meals: [
        makeMeal({
          items: [
            makeItem({
              name: { ar: 'كنافة بالفستق', en: 'Pistachio kunafa' },
              ingredients: ['سكر', 'ماء'],
            }),
          ],
        }),
      ],
    })
    expect(gate(plan, makeProfile({ allergies: ['treenut'] })).verdict).toBe('REJECT_MEAL')
  })

  it('rejects on the English name when the Arabic name is clean', () => {
    const plan = makePlan({
      meals: [
        makeMeal({
          items: [makeItem({ name: { ar: 'طبق اليوم', en: 'Shrimp salad' }, ingredients: ['خس'] })],
        }),
      ],
    })
    expect(gate(plan, makeProfile({ allergies: ['shellfish'] })).verdict).toBe('REJECT_MEAL')
  })

  it('outranks a calorie floor violation in the same plan', () => {
    const plan = makePlan({
      nutrition: { kcal: 900, protein: 100, carbs: 50, fat: 30, deficit: 200, weeklyLossTargetKg: 0.1 },
      meals: [makeMeal({ items: [makeItem({ ingredients: ['طحينة'] })] })],
    })
    const result = gate(plan, makeProfile({ allergies: ['sesame'] }))

    expect(result.verdict).toBe('REJECT_MEAL')
    expect(result.reasons.every((r) => r.code === 'ALLERGEN')).toBe(true)
  })

  it('passes a plan that carries none of the user’s allergens', () => {
    const plan = makePlan({
      meals: [makeMeal({ items: [makeItem({ ingredients: ['دجاج', 'طحينة'] })] })],
    })
    expect(gate(plan, makeProfile({ allergies: ['dairy'] })).verdict).toBe('PASS')
  })
})

describe('gate — calorie floors', () => {
  it('rejects below 1500 kcal for men', () => {
    const plan = makePlan({ nutrition: { ...makePlan().nutrition, kcal: 1499 } })
    const result = gate(plan, makeProfile({ sex: 'm' }))
    expect(result.verdict).toBe('REJECT')
    expect(result.reasons[0]).toMatchObject({ code: 'KCAL_FLOOR', limit: 1500 })
  })

  it('rejects below 1200 kcal for women', () => {
    const plan = makePlan({ nutrition: { ...makePlan().nutrition, kcal: 1199 } })
    expect(gate(plan, makeProfile({ sex: 'f' })).verdict).toBe('REJECT')
  })

  it('accepts exactly at the floor', () => {
    const plan = makePlan({ nutrition: { ...makePlan().nutrition, kcal: 1200, deficit: 0 } })
    expect(gate(plan, makeProfile({ sex: 'f' })).verdict).toBe('PASS')
  })

  it('rejects a deficit steeper than 25% of TDEE', () => {
    const profile = makeProfile()
    const plan = makePlan({
      nutrition: { ...makePlan().nutrition, deficit: Math.ceil(profile.tdee * 0.25) + 1 },
    })
    const result = gate(plan, profile)
    expect(result.verdict).toBe('REJECT')
    expect(result.reasons[0]?.code).toBe('DEFICIT_TOO_STEEP')
  })

  it('rejects a weekly loss target above 1% of body weight', () => {
    const plan = makePlan({ nutrition: { ...makePlan().nutrition, weeklyLossTargetKg: 0.86 } })
    const result = gate(plan, makeProfile({ weightKg: 85 }))
    expect(result.verdict).toBe('REJECT')
    expect(result.reasons[0]).toMatchObject({ code: 'LOSS_RATE_TOO_FAST', limit: 0.85 })
  })

  it('reports every floor a plan breaks at once', () => {
    const plan = makePlan({
      nutrition: { kcal: 1000, protein: 90, carbs: 40, fat: 30, deficit: 2000, weeklyLossTargetKg: 3 },
    })
    const codes = gate(plan, makeProfile()).reasons.map((r) => r.code)
    expect(codes).toEqual(['KCAL_FLOOR', 'DEFICIT_TOO_STEEP', 'LOSS_RATE_TOO_FAST'])
  })
})

describe('gate — injuries substitute patterns, they do not reject', () => {
  it('swaps a loaded-spine squat off a lower-back injury', () => {
    const result = gate(makePlan(), makeProfile({ injuries: ['lower_back'] }))

    expect(result.verdict).toBe('PASS')
    const [ex] = result.plan.days[0]!.exercises
    expect(ex!.id).not.toBe('back_squat')
    expect(ex!.pattern).not.toBe('squat_loaded_spine')
    expect(ex!.substitutedFor).toMatchObject({ id: 'back_squat', injury: 'lower_back' })
    expect(result.substitutions).toHaveLength(1)
  })

  it('keeps the replacement on the same primary muscle', () => {
    const result = gate(makePlan(), makeProfile({ injuries: ['lower_back'] }))
    expect(result.plan.days[0]!.exercises[0]!.muscles).toContain('quads')
  })

  it('never returns an exercise on a blocked pattern, across every injury', () => {
    const injuries = [
      'lower_back', 'knee', 'shoulder', 'neck', 'wrist', 'elbow', 'ankle', 'hip', 'hernia',
    ] as const
    const day = makeDay({
      exercises: [
        makeExercise(),
        makeExercise({ id: 'deadlift', pattern: 'hinge_loaded', muscles: ['hamstrings', 'glutes'] }),
        makeExercise({ id: 'ohp', pattern: 'push_vertical', muscles: ['shoulders', 'triceps'] }),
        makeExercise({ id: 'crunch', pattern: 'core_flexion', muscles: ['core'], equipment: 'none' }),
        makeExercise({ id: 'box_jump', pattern: 'jump', muscles: ['conditioning'], equipment: 'none' }),
      ],
    })

    for (const injury of injuries) {
      const result = gate(makePlan({ days: [day] }), makeProfile({ injuries: [injury] }))
      const blockedSeen = result.plan.days[0]!.exercises.filter((x) =>
        ({
          lower_back: ['hinge_loaded', 'squat_loaded_spine', 'core_flexion', 'core_rotation', 'jump', 'impact'],
          knee: ['jump', 'impact', 'lunge'],
          shoulder: ['push_vertical', 'push_horizontal_free'],
          neck: ['push_vertical', 'core_flexion', 'carry'],
          wrist: ['push_horizontal_free', 'carry'],
          elbow: ['arm_isolation', 'push_horizontal_free'],
          ankle: ['jump', 'impact', 'lunge', 'calf'],
          hip: ['hinge_loaded', 'lunge', 'jump', 'impact'],
          hernia: ['core_flexion', 'jump', 'hinge_loaded', 'carry'],
        })[injury].includes(x.pattern),
      )
      expect(blockedSeen, `${injury} leaked a blocked pattern`).toEqual([])
    }
  })

  it('handles several injuries at once', () => {
    const result = gate(makePlan(), makeProfile({ injuries: ['lower_back', 'knee', 'shoulder'] }))
    expect(result.verdict).toBe('PASS')
    expect(result.plan.days[0]!.exercises[0]!.pattern).toBe('squat_supported')
  })

  it('is deterministic', () => {
    const a = gate(makePlan(), makeProfile({ injuries: ['lower_back'] }))
    const b = gate(makePlan(), makeProfile({ injuries: ['lower_back'] }))
    expect(a.plan.days[0]!.exercises).toEqual(b.plan.days[0]!.exercises)
  })

  it('leaves the plan untouched when there are no injuries', () => {
    const plan = makePlan()
    const result = gate(plan, makeProfile())
    expect(result.plan).toBe(plan)
    expect(result.substitutions).toEqual([])
  })

  it('drops the slot rather than substituting the wrong muscle', () => {
    const day = makeDay({
      exercises: [makeExercise({ id: 'box_jump', pattern: 'jump', muscles: ['conditioning'], equipment: 'none' })],
    })
    const result = gate(makePlan({ days: [day] }), makeProfile({ equipment: [], injuries: ['knee'] }))
    expect(result.plan.days[0]!.exercises).toEqual([])
  })
})

describe('gate — cases that get no plan', () => {
  it('offers an alternative instead of a cut below BMI 18.5', () => {
    const result = gate(makePlan(), makeProfile({ weightKg: 50, heightCm: 180, goal: 'cut' }))
    expect(result.verdict).toBe('OFFER_ALTERNATIVE')
    expect(result.reasons[0]).toMatchObject({ code: 'UNDERWEIGHT_CUT', limit: 18.5 })
  })

  it('allows a low BMI when the goal is not a cut', () => {
    const result = gate(makePlan(), makeProfile({ weightKg: 50, heightCm: 180, goal: 'gain' }))
    expect(result.verdict).toBe('PASS')
  })

  it('blocks the account under 18 before any other rule runs', () => {
    const plan = makePlan({
      nutrition: { kcal: 800, protein: 60, carbs: 40, fat: 20, deficit: 3000, weeklyLossTargetKg: 5 },
      meals: [makeMeal({ items: [makeItem({ ingredients: ['طحينة'] })] })],
    })
    const result = gate(plan, makeProfile({ age: 17, allergies: ['sesame'] }))

    expect(result.verdict).toBe('BLOCK_ACCOUNT')
    expect(result.reasons).toEqual([{ code: 'MINOR', actual: 17, limit: 18 }])
  })

  it('allows exactly 18', () => {
    expect(gate(makePlan(), makeProfile({ age: 18 })).verdict).toBe('PASS')
  })
})

describe('allIngredients', () => {
  it('walks names and ingredient lists across every meal', () => {
    const plan = makePlan({
      meals: [
        makeMeal({ id: 'm1', items: [makeItem({ ingredients: ['أرز'] })] }),
        makeMeal({ id: 'm2', items: [makeItem({ ingredients: ['تمر', 'قهوة'] })] }),
      ],
    })
    const refs = allIngredients(plan)
    expect(refs.map((r) => r.ingredient)).toContain('أرز')
    expect(refs.map((r) => r.ingredient)).toContain('قهوة')
    expect(new Set(refs.map((r) => r.mealId))).toEqual(new Set(['m1', 'm2']))
  })
})
