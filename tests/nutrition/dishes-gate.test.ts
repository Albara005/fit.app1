import { describe, expect, it } from 'vitest'
import { DISHES } from '../../lib/nutrition/dishes'
import { ALLERGENS, matchIngredient } from '../../lib/safety/allergens'
import { allIngredients } from '../../lib/safety/gate'
import { makeItem, makeMeal, makePlan } from '../factories'

const ALL = ALLERGENS.map((g) => g.id)

/**
 * The meal sheet hides quick-picks by each dish's hand-written `contains` list.
 * That list is a second opinion on what the gate already decides from the
 * dish's name and ingredients — and a second opinion that can fall behind. Any
 * allergen the gate finds must also be declared, or a dish the gate would
 * refuse is offered as a one-tap pick to the very person it would refuse it for.
 */
describe('every dish declares what the gate finds in it', () => {
  it('has dishes to check', () => {
    expect(DISHES.length).toBeGreaterThan(0)
  })

  it.each(DISHES.map((d) => [d.id, d] as const))('%s', (_id, dish) => {
    // Through the gate's own walk, so whatever the gate starts reading, this
    // reads too.
    const plan = makePlan({ meals: [makeMeal({ items: [makeItem({ name: dish.name, ingredients: dish.ingredients })] })] })
    const found = new Set(
      allIngredients(plan).flatMap((ref) => matchIngredient(ref.ingredient, ALL).map((m) => m.allergen)),
    )
    const undeclared = [...found].filter((a) => !dish.contains.includes(a))
    expect(undeclared, `gate finds ${undeclared.join(', ')} not in contains[]`).toEqual([])
  })
})
