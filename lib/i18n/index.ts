import ar from '../../locales/ar.json'
import en from '../../locales/en.json'
import type { Locale } from '../types'

const BUNDLES = { ar, en } as const

type Bundle = Record<string, unknown>

function lookup(bundle: Bundle, path: string): string | undefined {
  let node: unknown = bundle
  for (const segment of path.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined
    node = (node as Bundle)[segment]
  }
  return typeof node === 'string' ? node : undefined
}

/**
 * `{{name}}` interpolation only. Numbers arrive already formatted, because Gulf
 * digital products use Western digits and a locale-aware number formatter would
 * quietly produce Eastern Arabic ones.
 */
function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    key in params ? String(params[key]) : `{{${key}}}`,
  )
}

export function translate(
  locale: Locale,
  key: string,
  params: Record<string, string | number> = {},
): string {
  // Arabic is the source language, not a translation of English: it is the
  // fallback when a key is missing rather than the other way round.
  const text = lookup(BUNDLES[locale], key) ?? lookup(BUNDLES.ar, key)
  if (text === undefined) {
    if (__DEV__) console.warn(`[i18n] missing key: ${key}`)
    return key
  }
  const out = interpolate(text, params)
  return locale === 'ar' ? isolateRanges(out) : out
}

/**
 * An en dash does not hold two numbers in one run under the bidi algorithm, so
 * inside Arabic "كل 6–8 أسابيع" drew its range as 8–6. Every Arabic string gets
 * its numeric ranges isolated here, once, rather than each string — or each
 * future one — remembering to. A range already isolated is left alone.
 */
const RANGE = /(?<![\u2066\d.])\d+(?:\.\d+)?–\d+(?:\.\d+)?(?![\d.])/g

export function isolateRanges(text: string): string {
  return text.replace(RANGE, (range) => ltr(range))
}

export function makeT(locale: Locale) {
  return (key: string, params?: Record<string, string | number>) => translate(locale, key, params)
}

export type TFunction = ReturnType<typeof makeT>

export const RTL_LOCALES: readonly Locale[] = ['ar']

export function isRtl(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale)
}

/**
 * Wraps a run in a left-to-right isolate so bidi cannot reorder it.
 *
 * A leading "-" is a bidi-weak character: inside an Arabic paragraph "-3.85"
 * renders as "3.85-", which reads as a trailing dash rather than a negative
 * number. Signed numbers, ratios and ranges all need this; unsigned digits are
 * fine without it, but isolating them costs nothing and removes the judgement
 * call about which ones need it.
 */
export function ltr(text: string | number): string {
  return `\u2066${text}\u2069`
}
