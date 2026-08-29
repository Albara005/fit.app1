import type { Macros } from './estimate'

/**
 * The nutrition label, read as numbers rather than as an image.
 *
 * This is the cheapest and most accurate path in the app and it uses no model
 * at all: the panel already states the answer per 100 g, so the only work is
 * arithmetic. A vision model here would cost money to be less accurate than
 * addition.
 */
export interface Per100g {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface LabelDraft {
  kcal: string
  protein: string
  carbs: string
  fat: string
  grams: string
}

export const EMPTY_LABEL: LabelDraft = { kcal: '', protein: '', carbs: '', fat: '', grams: '' }

/** Accepts a comma decimal separator, which Arabic keyboards produce. */
export function parseNumber(input: string): number | null {
  const normalised = input.trim().replace('٫', '.').replace(',', '.')
  if (normalised === '') return null
  const value = Number(normalised)
  return Number.isFinite(value) && value >= 0 ? value : null
}

export interface LabelValidation {
  per100g: Per100g | null
  grams: number | null
  /** Field keys that are missing or unusable, for inline marking. */
  invalid: (keyof LabelDraft)[]
  /** Set when the macros cannot add up to the stated energy. */
  inconsistent: boolean
}

/** Protein and carbohydrate are 4 kcal/g, fat 9. The panel has to agree. */
export function energyFromMacros(per100g: Per100g): number {
  return per100g.protein * 4 + per100g.carbs * 4 + per100g.fat * 9
}

export function validateLabel(draft: LabelDraft): LabelValidation {
  const invalid: (keyof LabelDraft)[] = []
  const numbers: Partial<Record<keyof LabelDraft, number>> = {}

  for (const key of ['kcal', 'protein', 'carbs', 'fat', 'grams'] as const) {
    const value = parseNumber(draft[key])
    if (value === null) invalid.push(key)
    else numbers[key] = value
  }

  // A serving of zero grams is a typo, not a serving.
  if (numbers.grams !== undefined && numbers.grams <= 0 && !invalid.includes('grams')) {
    invalid.push('grams')
  }
  // Nothing edible carries more than 100 g of one macro per 100 g.
  for (const key of ['protein', 'carbs', 'fat'] as const) {
    if ((numbers[key] ?? 0) > 100 && !invalid.includes(key)) invalid.push(key)
  }

  if (invalid.length > 0) {
    return { per100g: null, grams: null, invalid, inconsistent: false }
  }

  const per100g: Per100g = {
    kcal: numbers.kcal!,
    protein: numbers.protein!,
    carbs: numbers.carbs!,
    fat: numbers.fat!,
  }

  // Panels round, and fibre and polyols are counted differently across
  // jurisdictions, so a 20% band is the honest tolerance — tight enough to
  // catch a digit typed into the wrong box, loose enough not to nag.
  const derived = energyFromMacros(per100g)
  const inconsistent = per100g.kcal > 0 && Math.abs(derived - per100g.kcal) > per100g.kcal * 0.2

  return { per100g, grams: numbers.grams!, invalid: [], inconsistent }
}

export function macrosForServing(per100g: Per100g, grams: number): Macros {
  const f = grams / 100
  return {
    kcal: Math.round(per100g.kcal * f),
    protein: Math.round(per100g.protein * f),
    carbs: Math.round(per100g.carbs * f),
    fat: Math.round(per100g.fat * f),
  }
}
