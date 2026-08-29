import { describe, expect, it } from 'vitest'
import { localRepo } from '../../lib/data/local'
import { createKv } from '../../lib/data/kv'
import { buildTemplatePlan } from '../../lib/plan/engine'
import { producePlan } from '../../lib/plan/generate'
import { makeItem, makeMeal, makePlan, makeProfile } from '../factories'

const freshRepo = () => localRepo(createKv())

describe('producePlan', () => {
  it('ships the rules-based plan when there is no model', async () => {
    const repo = freshRepo()
    const out = await producePlan({ repo, profile: makeProfile(), weekIndex: 0 })

    expect(out.verdict).toBe('PASS')
    expect(out.plan?.source).toBe('template')
    expect(out.fellBack).toBe(false)
    expect(await repo.getPlan(0)).not.toBeNull()
  })

  it('uses a model plan that passes the gate', async () => {
    const repo = freshRepo()
    const profile = makeProfile()
    const modelPlan = { ...buildTemplatePlan(profile, 0), source: 'model' as const }
    const out = await producePlan({ repo, profile, weekIndex: 0, fromModel: async () => modelPlan })

    expect(out.plan?.source).toBe('model')
    expect(out.fellBack).toBe(false)
  })

  it('falls back and records the rejection when a model plan carries an allergen', async () => {
    const repo = freshRepo()
    const profile = makeProfile({ allergies: ['sesame'] })
    const poisoned = makePlan({
      source: 'model',
      meals: [makeMeal({ items: [makeItem({ ingredients: ['دجاج', 'طحينة'] })] })],
    })

    const out = await producePlan({ repo, profile, weekIndex: 0, fromModel: async () => poisoned })

    expect(out.verdict).toBe('PASS')
    expect(out.plan?.source).toBe('template')
    expect(out.fellBack).toBe(true)

    const saved = await repo.getPlan(0)
    expect(saved?.source).toBe('template')
  })

  it('never persists a plan that failed the gate', async () => {
    const repo = freshRepo()
    const profile = makeProfile({ allergies: ['dairy'] })
    const poisoned = makePlan({
      source: 'model',
      meals: [makeMeal({ items: [makeItem({ name: { ar: 'كنافة', en: 'Kunafa' }, ingredients: [] })] })],
    })

    await producePlan({ repo, profile, weekIndex: 0, fromModel: async () => poisoned })
    const saved = await repo.getPlan(0)
    for (const meal of saved!.meals) {
      for (const item of meal.items) expect(item.name.ar).not.toContain('كنافة')
    }
  })

  it('treats a model failure as no plan, not as an error', async () => {
    const repo = freshRepo()
    const out = await producePlan({
      repo,
      profile: makeProfile(),
      weekIndex: 0,
      fromModel: async () => {
        throw new Error('edge function timed out')
      },
    })

    expect(out.plan?.source).toBe('template')
    expect(out.verdict).toBe('PASS')
  })

  it('returns no plan at all for an under-18 profile', async () => {
    const repo = freshRepo()
    const out = await producePlan({ repo, profile: makeProfile({ age: 16 }), weekIndex: 0 })

    expect(out.verdict).toBe('BLOCK_ACCOUNT')
    expect(out.plan).toBeNull()
    expect(await repo.getPlan(0)).toBeNull()
  })

  it('offers an alternative rather than a cut for an underweight profile', async () => {
    const repo = freshRepo()
    const out = await producePlan({
      repo,
      profile: makeProfile({ weightKg: 50, heightCm: 180, goal: 'cut' }),
      weekIndex: 0,
    })
    expect(out.verdict).toBe('OFFER_ALTERNATIVE')
  })
})
