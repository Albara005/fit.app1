import { describe, expect, it } from 'vitest'
import { estimateMeal } from '../../lib/nutrition/estimate'
import {
  EMPTY_LABEL, energyFromMacros, macrosForServing, parseNumber, validateLabel, type LabelDraft,
} from '../../lib/nutrition/label'

const draft = (over: Partial<LabelDraft> = {}): LabelDraft => ({
  kcal: '380', protein: '12', carbs: '60', fat: '9', grams: '45', ...over,
})

describe('parseNumber', () => {
  it.each([
    ['12', 12], ['12.5', 12.5], ['12,5', 12.5], ['12٫5', 12.5],
    ['  8 ', 8], ['0', 0], ['', null], ['abc', null], ['-3', null],
  ])('%s', (input, expected) => {
    expect(parseNumber(input)).toBe(expected)
  })
})

describe('validateLabel', () => {
  it('accepts a well-formed panel', () => {
    const result = validateLabel(draft())
    expect(result.invalid).toEqual([])
    expect(result.per100g).toEqual({ kcal: 380, protein: 12, carbs: 60, fat: 9 })
    expect(result.grams).toBe(45)
    expect(result.inconsistent).toBe(false)
  })

  it('names every empty field rather than just the first', () => {
    expect(validateLabel(EMPTY_LABEL).invalid).toEqual(['kcal', 'protein', 'carbs', 'fat', 'grams'])
  })

  it('rejects a zero-gram serving', () => {
    expect(validateLabel(draft({ grams: '0' })).invalid).toContain('grams')
  })

  it('rejects a macro above 100 g per 100 g', () => {
    expect(validateLabel(draft({ fat: '120' })).invalid).toContain('fat')
  })

  it('flags a panel whose macros cannot add up to its energy', () => {
    // 12/60/9 is about 370 kcal; a label claiming 900 has a digit in the wrong box.
    expect(validateLabel(draft({ kcal: '900' })).inconsistent).toBe(true)
  })

  it('tolerates the rounding a real panel carries', () => {
    expect(validateLabel(draft({ kcal: '400' })).inconsistent).toBe(false)
  })

  it('does not call a panel inconsistent when it states no energy', () => {
    expect(validateLabel(draft({ kcal: '0' })).inconsistent).toBe(false)
  })

  it('computes energy from macros at 4/4/9', () => {
    expect(energyFromMacros({ kcal: 0, protein: 10, carbs: 10, fat: 10 })).toBe(170)
  })
})

describe('macrosForServing', () => {
  it('scales the panel to the portion actually eaten', () => {
    const per100g = { kcal: 380, protein: 12, carbs: 60, fat: 9 }
    expect(macrosForServing(per100g, 45)).toEqual({ kcal: 171, protein: 5, carbs: 27, fat: 4 })
  })

  it('is exact at 100 g', () => {
    const per100g = { kcal: 380, protein: 12, carbs: 60, fat: 9 }
    expect(macrosForServing(per100g, 100)).toEqual(per100g)
  })
})

describe('a label beats a photograph', () => {
  it('produces a far tighter range than the camera path', () => {
    const base = macrosForServing({ kcal: 380, protein: 12, carbs: 60, fat: 9 }, 45)
    const fromLabel = estimateMeal({ base, source: 'label', cookMethod: null, portion: null })
    const fromPhoto = estimateMeal({ base, source: 'photo', cookMethod: null, portion: null })

    expect(fromLabel.kcal.max - fromLabel.kcal.min).toBeLessThan(fromPhoto.kcal.max - fromPhoto.kcal.min)
    expect(fromLabel.confidence).toBe('high')
  })
})
