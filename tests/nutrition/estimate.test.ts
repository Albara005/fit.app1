import { describe, expect, it } from 'vitest'
import { estimateMeal, formatRange, midpoint, type Macros } from '../../lib/nutrition/estimate'
import { CORRECTIONS_BEFORE_MEMORY, dishKey, memoryLine, recall, type Correction } from '../../lib/nutrition/memory'

const base: Macros = { kcal: 500, protein: 30, carbs: 55, fat: 18 }
const width = (r: { min: number; max: number }) => r.max - r.min

describe('estimateMeal', () => {
  it('returns a range, never a single number', () => {
    const e = estimateMeal({ base, source: 'photo', cookMethod: null, portion: null })
    expect(e.kcal.max).toBeGreaterThan(e.kcal.min)
  })

  it('keeps the fat range wider than carbs and protein — oil does not show', () => {
    const e = estimateMeal({ base, source: 'photo', cookMethod: null, portion: null })
    const rel = (r: { min: number; max: number }, v: number) => width(r) / v
    expect(rel(e.fat, base.fat)).toBeGreaterThan(rel(e.carbs, base.carbs))
    expect(rel(e.fat, base.fat)).toBeGreaterThan(rel(e.protein, base.protein))
  })

  it('skews unknown fat upward rather than symmetrically', () => {
    const e = estimateMeal({ base, source: 'photo', cookMethod: null, portion: null })
    expect(e.fat.max - base.fat).toBeGreaterThan(base.fat - e.fat.min)
  })

  it('narrows the range as the two questions get answered', () => {
    const none = estimateMeal({ base, source: 'photo', cookMethod: null, portion: null })
    const one = estimateMeal({ base, source: 'photo', cookMethod: 'grilled', portion: null })
    const both = estimateMeal({ base, source: 'photo', cookMethod: 'grilled', portion: 'normal' })
    expect(width(one.kcal)).toBeLessThan(width(none.kcal))
    expect(width(both.kcal)).toBeLessThan(width(one.kcal))
  })

  it('raises fat and calories for fried, lowers them for boiled', () => {
    const fried = estimateMeal({ base, source: 'photo', cookMethod: 'fried', portion: 'normal' })
    const boiled = estimateMeal({ base, source: 'photo', cookMethod: 'boiled', portion: 'normal' })
    expect(midpoint(fried.fat)).toBeGreaterThan(midpoint(boiled.fat))
    expect(midpoint(fried.kcal)).toBeGreaterThan(midpoint(boiled.kcal))
  })

  it('scales with portion size', () => {
    const half = estimateMeal({ base, source: 'photo', cookMethod: 'grilled', portion: 'half' })
    const large = estimateMeal({ base, source: 'photo', cookMethod: 'grilled', portion: 'large' })
    expect(midpoint(large.kcal)).toBeGreaterThan(midpoint(half.kcal) * 2)
  })

  it('trusts a label far more than a photo', () => {
    const photo = estimateMeal({ base, source: 'photo', cookMethod: null, portion: null })
    const label = estimateMeal({ base, source: 'label', cookMethod: null, portion: null })
    expect(width(label.kcal)).toBeLessThan(width(photo.kcal))
    expect(label.confidence).toBe('high')
    expect(photo.confidence).toBe('low')
  })

  it('reaches medium confidence from a photo only once both questions are answered', () => {
    expect(estimateMeal({ base, source: 'photo', cookMethod: 'fried', portion: null }).confidence).toBe('low')
    expect(estimateMeal({ base, source: 'photo', cookMethod: 'fried', portion: 'large' }).confidence).toBe('medium')
  })

  it('never returns a negative floor', () => {
    const e = estimateMeal({ base: { kcal: 20, protein: 1, carbs: 2, fat: 0.5 }, source: 'photo', cookMethod: null, portion: null })
    expect(e.fat.min).toBeGreaterThanOrEqual(0)
    expect(e.kcal.min).toBeGreaterThanOrEqual(0)
  })

  it('formats with Western digits and an en dash', () => {
    expect(formatRange({ min: 420, max: 560 }, 'سعرة')).toBe('420–560 سعرة')
  })
})

describe('dish memory', () => {
  const c = (kcal: number, at: string): Correction => ({
    dishKey: 'kbsa', kcal, portion: 'normal', cookMethod: 'fried', city: 'مسقط', correctedAt: at,
  })

  it('normalises a dish label into a stable key', () => {
    expect(dishKey('كَبْسَة دجاج')).toBe(dishKey('كبسه  دجاج'))
  })

  it('stays quiet until three corrections exist', () => {
    expect(recall([c(500, '1'), c(560, '2')], 'kbsa')).toBeNull()
    expect(recall([c(500, '1'), c(560, '2'), c(590, '3')], 'kbsa')).not.toBeNull()
    expect(CORRECTIONS_BEFORE_MEMORY).toBe(3)
  })

  it('trims outliers once there are enough samples', () => {
    const withTypo = [c(540, '1'), c(550, '2'), c(560, '3'), c(570, '4'), c(9000, '5')]
    expect(recall(withTypo, 'kbsa')!.kcal).toBeLessThan(600)
  })

  it('ignores corrections for other dishes', () => {
    const other: Correction = { ...c(100, '9'), dishKey: 'salad' }
    expect(recall([c(500, '1'), c(560, '2'), other], 'kbsa')).toBeNull()
  })

  it('speaks in the user’s own terms', () => {
    const memory = recall([c(540, '1'), c(550, '2'), c(560, '3')], 'kbsa')!
    expect(memoryLine('كبستك', memory, 'ar')).toBe('كبستك عندك عادةً 550 سعرة.')
    expect(memoryLine('kabsa', memory, 'en')).toContain('550')
  })
})
