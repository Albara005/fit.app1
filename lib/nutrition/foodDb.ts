import type { Per100g } from './label'

/**
 * Barcode lookup. Deliberately not a model call: a product code resolves to a
 * row in a database, which is cheaper, faster and exact where a vision model
 * would be expensive, slow and approximate.
 *
 * Every failure returns null. The label-entry screen is the fallback and needs
 * no network at all, so an unreachable database costs the user a few taps
 * rather than an error.
 */
const DEFAULT_ENDPOINT = 'https://world.openfoodfacts.org/api/v2/product'
const TIMEOUT_MS = 6000

export interface Product {
  name: string
  per100g: Per100g
}

/** EAN-8, UPC-A and EAN-13, which is everything on a Gulf shelf. */
export function isBarcodeShaped(code: string): boolean {
  return /^\d{8}$|^\d{12,13}$/.test(code.trim())
}

/**
 * The GS1 check digit. Validating locally means a misread scan is rejected
 * before it costs a network round trip.
 */
export function hasValidCheckDigit(code: string): boolean {
  const digits = code.trim()
  if (!isBarcodeShaped(digits)) return false
  const body = digits.slice(0, -1).split('').map(Number).reverse()
  const sum = body.reduce((total, digit, i) => total + digit * (i % 2 === 0 ? 3 : 1), 0)
  return (10 - (sum % 10)) % 10 === Number(digits.at(-1))
}

function toNumber(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : value
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : null
}

/** Open Food Facts states energy in kJ as well as kcal; kcal is preferred. */
export function parseProduct(payload: unknown): Product | null {
  if (typeof payload !== 'object' || payload === null) return null
  const root = payload as Record<string, unknown>
  const product = root.product as Record<string, unknown> | undefined
  if (!product) return null

  const nutriments = (product.nutriments ?? {}) as Record<string, unknown>
  const kcal =
    toNumber(nutriments['energy-kcal_100g']) ??
    (toNumber(nutriments['energy-kj_100g']) !== null
      ? Math.round(toNumber(nutriments['energy-kj_100g'])! / 4.184)
      : null)
  const protein = toNumber(nutriments.proteins_100g)
  const carbs = toNumber(nutriments.carbohydrates_100g)
  const fat = toNumber(nutriments.fat_100g)

  // A partial row is worse than none: it would silently invent zeroes for the
  // macros the panel does happen to state.
  if (kcal === null || protein === null || carbs === null || fat === null) return null

  const name = typeof product.product_name === 'string' ? product.product_name.trim() : ''
  return { name, per100g: { kcal, protein, carbs, fat } }
}

export async function lookupBarcode(code: string): Promise<Product | null> {
  if (!hasValidCheckDigit(code)) return null

  const base = process.env.EXPO_PUBLIC_FOOD_DB_URL ?? DEFAULT_ENDPOINT
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(
      `${base}/${encodeURIComponent(code.trim())}.json?fields=product_name,nutriments`,
      { signal: controller.signal },
    )
    if (!response.ok) return null
    return parseProduct(await response.json())
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
