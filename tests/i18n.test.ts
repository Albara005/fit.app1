import { describe, expect, it } from 'vitest'
import ar from '../locales/ar.json'
import en from '../locales/en.json'
import { AR_COUNT, countAr, countEn, isRtl, isolateRanges, ltr, makeT, translate } from '../lib/i18n'

type Node = Record<string, unknown>
const flatten = (node: Node, prefix = ''): string[] =>
  Object.entries(node).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? flatten(value as Node, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  )

describe('locale bundles', () => {
  it('carry exactly the same keys in both languages', () => {
    expect(flatten(ar as Node).sort()).toEqual(flatten(en as Node).sort())
  })

  it('have no empty strings', () => {
    for (const bundle of [ar, en]) {
      const walk = (node: Node, path = ''): void => {
        for (const [key, value] of Object.entries(node)) {
          if (typeof value === 'object' && value !== null) walk(value as Node, `${path}${key}.`)
          else expect(String(value).trim(), `${path}${key}`).not.toBe('')
        }
      }
      walk(bundle as Node)
    }
  })

  it('use Western digits everywhere, with no exceptions', () => {
    // Eastern Arabic numerals are correct Arabic and wrong for this product:
    // Gulf digital products use 0-9, so a screen that mixes them looks foreign.
    const eastern = /[٠-٩]/
    for (const key of flatten(ar as Node)) {
      expect(eastern.test(translate('ar', key)), key).toBe(false)
    }
  })

  it('keep the same interpolation placeholders in both languages', () => {
    const placeholders = (s: string) => [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort()
    for (const key of flatten(ar as Node)) {
      expect(placeholders(translate('ar', key)), key).toEqual(placeholders(translate('en', key)))
    }
  })
})

describe('translate', () => {
  it('interpolates named parameters', () => {
    expect(translate('en', 'today.estMinutes', { minutes: 45 })).toBe('About 45 min')
    expect(translate('ar', 'plan.week', { index: 3 })).toBe('الأسبوع 3')
  })

  it('leaves an unsupplied placeholder visible rather than printing undefined', () => {
    expect(translate('en', 'today.estMinutes')).toContain('{{minutes}}')
  })

  it('falls back to Arabic, the source language, for a missing key', () => {
    expect(translate('en', 'nope.not.here')).toBe('nope.not.here')
  })

  it('marks Arabic as right-to-left and English as not', () => {
    expect(isRtl('ar')).toBe(true)
    expect(isRtl('en')).toBe(false)
  })

  it('binds a locale once', () => {
    expect(makeT('ar')('common.save')).toBe('حفظ')
  })
})

describe('units', () => {
  it('gives every unit a translation rather than a hard-coded abbreviation', () => {
    // "28 يوم" shipped as the age field until a browser pass caught it: the
    // unit was reaching for whichever key looked close enough.
    for (const key of ['kcal', 'gram', 'kg', 'cm', 'hour', 'second', 'year', 'minute']) {
      expect(translate('ar', `common.${key}`), key).not.toBe(`common.${key}`)
      expect(translate('en', `common.${key}`), key).not.toBe(`common.${key}`)
    }
    expect(translate('ar', 'common.year')).not.toBe(translate('ar', 'common.day'))
  })
})

describe('bidi isolation', () => {
  it('wraps a run so a leading sign cannot be reordered', () => {
    // Without this, "-3.85" inside an Arabic paragraph renders as "3.85-".
    expect(ltr('-3.85')).toBe('⁦-3.85⁩')
    expect(ltr(7)).toBe('⁦7⁩')
  })

  it('leaves the visible characters untouched', () => {
    expect(ltr('-3.85').replace(/[⁦⁩]/g, '')).toBe('-3.85')
  })
})

describe('Arabic numeric ranges', () => {
  // An en dash does not hold two numbers in one run under the bidi algorithm:
  // unisolated, "كل 6–8 أسابيع" drew its range as 8–6.
  it('are isolated inside Arabic text', () => {
    expect(isolateRanges('كل 6–8 أسابيع')).toBe('كل \u20666–8\u2069 أسابيع')
    expect(isolateRanges('1.5–2.5 كجم')).toBe('\u20661.5–2.5\u2069 كجم')
  })

  it('are not isolated twice', () => {
    expect(isolateRanges('\u2066229–274\u2069 سعرة')).toBe('\u2066229–274\u2069 سعرة')
  })

  it('leave a hyphenated rep range alone: the bidi rules already keep it whole', () => {
    expect(isolateRanges('3 × 8-10')).toBe('3 × 8-10')
  })

  it('apply to Arabic copy only', () => {
    expect(translate('ar', 'onboarding.loopPhaseTime')).toContain('\u20666–8\u2069')
    expect(translate('en', 'onboarding.loopPhaseTime')).toBe('Every 6–8 weeks')
  })
})

describe('counting', () => {
  it('gives one and two their own Arabic forms', () => {
    expect(countAr(1, AR_COUNT.days)).toBe('يوم واحد')
    expect(countAr(2, AR_COUNT.days)).toBe('يومين')
    expect(countAr(2, AR_COUNT.hours)).toBe('ساعتين')
  })

  it('takes the plural from three to ten, the singular from eleven', () => {
    expect(countAr(3, AR_COUNT.weeks)).toBe('3 أسابيع')
    expect(countAr(10, AR_COUNT.minutes)).toBe('10 دقائق')
    expect(countAr(11, AR_COUNT.weeks)).toBe('11 أسبوع')
    expect(countAr(45, AR_COUNT.minutes)).toBe('45 دقيقة')
  })

  it('reads a fraction as the plural', () => {
    expect(countAr(4.5, AR_COUNT.hours)).toBe('4.5 ساعات')
  })

  it('makes English singular only at one', () => {
    expect(countEn(1, 'hour', 'hours')).toBe('1 hour')
    expect(countEn(2, 'hour', 'hours')).toBe('2 hours')
  })
})
