import type { CookMethod, MacroRange, MealEstimate, PortionSize } from '../types'

export type EstimateSource = 'photo' | 'label' | 'barcode' | 'library' | 'memory'

export interface Macros {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

/**
 * Relative half-width of each macro's range, by where the numbers came from.
 *
 * Photo values follow the 2026 Nutrients findings: energy from an image is
 * nearly unbiased (−2.0%) while fat runs +52.3% wrong, because oil does not
 * show up in a photograph. Gulf cooking uses more oil than the study's meals,
 * not less, so these are floors on our error, not ceilings.
 */
const SPREAD: Record<EstimateSource, Macros> = {
  photo: { kcal: 0.18, protein: 0.22, carbs: 0.25, fat: 0.55 },
  library: { kcal: 0.12, protein: 0.12, carbs: 0.14, fat: 0.25 },
  memory: { kcal: 0.08, protein: 0.12, carbs: 0.14, fat: 0.18 },
  label: { kcal: 0.03, protein: 0.05, carbs: 0.05, fat: 0.05 },
  barcode: { kcal: 0.03, protein: 0.05, carbs: 0.05, fat: 0.05 },
}

/** Knowing how it was cooked is most of what a photo cannot tell us. */
const COOK_FACTOR: Record<CookMethod, { kcal: number; fat: number }> = {
  fried: { kcal: 1.25, fat: 1.9 },
  grilled: { kcal: 1.0, fat: 1.0 },
  boiled: { kcal: 0.9, fat: 0.75 },
}

const PORTION_FACTOR: Record<PortionSize, number> = { half: 0.6, normal: 1, large: 1.5 }

/** Each answered question buys back a slice of the range. */
const ANSWER_TIGHTENING = 0.75

function range(value: number, spread: number, skew = 0): MacroRange {
  const half = value * spread
  return {
    min: Math.max(0, Math.round(value - half * (1 - skew))),
    max: Math.round(value + half * (1 + skew)),
  }
}

function confidenceFor(source: EstimateSource, answered: number): MealEstimate['confidence'] {
  if (source === 'label' || source === 'barcode' || source === 'memory') return 'high'
  if (source === 'library') return answered === 2 ? 'high' : 'medium'
  return answered === 2 ? 'medium' : 'low'
}

export interface EstimateInput {
  base: Macros
  source: EstimateSource
  cookMethod: CookMethod | null
  portion: PortionSize | null
}

/**
 * Returns a range and a confidence, never a single number. The product promise
 * is consistency, not accuracy — claiming a precise calorie count from a
 * photograph would be a claim we cannot keep.
 */
export function estimateMeal({ base, source, cookMethod, portion }: EstimateInput): MealEstimate {
  const cook = cookMethod ? COOK_FACTOR[cookMethod] : { kcal: 1, fat: 1 }
  const size = portion ? PORTION_FACTOR[portion] : 1
  const answered = (cookMethod ? 1 : 0) + (portion ? 1 : 0)

  const spread = SPREAD[source]
  const tighten = ANSWER_TIGHTENING ** answered

  const kcal = base.kcal * cook.kcal * size
  const fat = base.fat * cook.fat * size
  const protein = base.protein * size
  const carbs = base.carbs * size

  // Unknown cooking method skews fat upward rather than symmetrically: the
  // error we cannot see is almost always oil that was added, not oil removed.
  const fatSkew = cookMethod ? 0 : 0.35

  return {
    kcal: range(kcal, spread.kcal * tighten, cookMethod ? 0 : 0.15),
    protein: range(protein, spread.protein * tighten),
    carbs: range(carbs, spread.carbs * tighten),
    fat: range(fat, spread.fat * tighten, fatSkew),
    confidence: confidenceFor(source, answered),
  }
}

export function midpoint(r: MacroRange): number {
  return Math.round((r.min + r.max) / 2)
}

/** "420–560 سعرة" — Western digits in both locales, per the product's numbers rule. */
export function formatRange(r: MacroRange, unit = ''): string {
  return `${r.min}–${r.max}${unit ? ` ${unit}` : ''}`
}
