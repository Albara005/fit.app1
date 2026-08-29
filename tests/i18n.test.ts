import { describe, expect, it } from 'vitest'
import ar from '../locales/ar.json'
import en from '../locales/en.json'
import { isRtl, makeT, translate } from '../lib/i18n'

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
