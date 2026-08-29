import { describe, expect, it } from 'vitest'
import { hasValidCheckDigit, isBarcodeShaped, parseProduct } from '../../lib/nutrition/foodDb'

describe('barcode shape', () => {
  it.each([
    ['73762806450', false], ['737628064502', true], ['5449000000996', true],
    ['96385074', true], ['1234567', false], ['abcdefgh', false], ['', false],
  ])('%s', (code, expected) => {
    expect(isBarcodeShaped(code)).toBe(expected)
  })
})

describe('check digit', () => {
  it('accepts real codes', () => {
    expect(hasValidCheckDigit('5449000000996')).toBe(true)
    expect(hasValidCheckDigit('96385074')).toBe(true)
  })

  it('rejects a single transposed digit, which is what a misread looks like', () => {
    expect(hasValidCheckDigit('5449000000997')).toBe(false)
    expect(hasValidCheckDigit('5449000009096')).toBe(false)
  })

  it('rejects anything the wrong length before doing arithmetic', () => {
    expect(hasValidCheckDigit('544900000099')).toBe(false)
  })
})

describe('parseProduct', () => {
  const payload = (nutriments: Record<string, unknown>, name = 'Digestive Biscuits') => ({
    product: { product_name: name, nutriments },
  })

  it('reads a complete panel', () => {
    const result = parseProduct(
      payload({ 'energy-kcal_100g': 480, proteins_100g: 7, carbohydrates_100g: 62, fat_100g: 21 }),
    )
    expect(result).toEqual({
      name: 'Digestive Biscuits',
      per100g: { kcal: 480, protein: 7, carbs: 62, fat: 21 },
    })
  })

  it('converts kilojoules when kcal is absent', () => {
    const result = parseProduct(
      payload({ 'energy-kj_100g': 2008, proteins_100g: 7, carbohydrates_100g: 62, fat_100g: 21 }),
    )
    expect(result?.per100g.kcal).toBe(480)
  })

  it('accepts numbers that arrive as strings', () => {
    const result = parseProduct(
      payload({ 'energy-kcal_100g': '480', proteins_100g: '7', carbohydrates_100g: '62', fat_100g: '21' }),
    )
    expect(result?.per100g.protein).toBe(7)
  })

  it('refuses a partial row rather than inventing zeroes', () => {
    expect(parseProduct(payload({ 'energy-kcal_100g': 480, proteins_100g: 7 }))).toBeNull()
  })

  it('survives junk', () => {
    expect(parseProduct(null)).toBeNull()
    expect(parseProduct({})).toBeNull()
    expect(parseProduct({ product: {} })).toBeNull()
    expect(parseProduct('nope')).toBeNull()
  })

  it('tolerates a missing product name', () => {
    const result = parseProduct(
      payload({ 'energy-kcal_100g': 480, proteins_100g: 7, carbohydrates_100g: 62, fat_100g: 21 }, ''),
    )
    expect(result?.name).toBe('')
  })
})
