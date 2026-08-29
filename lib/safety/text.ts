/**
 * Normalisation + boundary-aware matching for ingredient text.
 *
 * Plain substring matching is the failure mode this module exists to prevent:
 * "خبز لبناني" contains the letters of "لبن", and "حليب لوز" contains "حليب"
 * without containing any dairy. Both would be wrong answers from an allergen
 * map, in opposite directions. So terms match on morphological boundaries —
 * Arabic clitic prefixes and a closed set of suffixes — not on raw substrings.
 */

const AR_LETTER = 'ء-ي'
const AR_DIACRITIC = /[ً-ٰٟۖ-ۭ]/g
const TATWEEL = /ـ/g
const ARABIC_INDIC = /[٠-٩۰-۹]/g

/** Arabic clitics that may attach before a noun: و ف ب ل ك and the article ال. */
const AR_PREFIX = `(?:[\\u0648\\u0641\\u0628\\u0644\\u0643]?(?:\\u0627\\u0644)?)`

/**
 * Closed suffix set. "ان" is deliberately absent: allowing it would make
 * "لبن" match "لبنان".
 */
const AR_SUFFIX = `(?:\\u0627\\u062A|\\u064A\\u0629|\\u064A\\u0646|\\u0647\\u0627|\\u0647\\u0645|\\u0629|\\u0647|\\u064A|\\u0627)?`

export function normalize(input: string): string {
  return input
    .replace(AR_DIACRITIC, '')
    .replace(TATWEEL, '')
    .replace(ARABIC_INDIC, (d) => String(d.charCodeAt(0) & 0x0f))
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[_\-–—/\\.,;:()[\]{}'"«»]/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function hasArabic(term: string): boolean {
  return new RegExp(`[${AR_LETTER}]`).test(term)
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const cache = new Map<string, RegExp>()

/**
 * Builds a boundary-anchored matcher for one term. Arabic terms allow clitic
 * prefixes and inflectional suffixes; Latin terms use word boundaries with an
 * optional plural.
 */
export function termPattern(term: string): RegExp {
  const key = term
  const cached = cache.get(key)
  if (cached) return cached

  const t = normalize(term)
  const body = escapeRe(t).replace(/\\?\s+/g, '\\s+')
  const re = hasArabic(t)
    ? new RegExp(`(?:^|[^${AR_LETTER}])${AR_PREFIX}${body}${AR_SUFFIX}(?![${AR_LETTER}])`)
    : new RegExp(`(?:^|[^a-z0-9])${body}(?:e?s)?(?![a-z0-9])`)

  cache.set(key, re)
  return re
}

export function matchesTerm(text: string, term: string): boolean {
  return termPattern(term).test(` ${normalize(text)} `)
}

export function findTerm(text: string, terms: readonly string[]): string | null {
  const haystack = ` ${normalize(text)} `
  for (const term of terms) {
    if (termPattern(term).test(haystack)) return term
  }
  return null
}

/**
 * "خبز خالي من الجلوتين" and "dairy-free yoghurt" name the allergen in order to
 * exclude it. Detected generically so every group inherits the guard rather
 * than each group repeating the phrases.
 */
const AR_FREE_OF = /(?:خالي|خاليه|خالص|بدون|من دون)\s+(?:من\s+)?([^,،.]*)/
const EN_FREE_OF = /([a-z\s]+?)[-\s]free\b/

export function freeOfSegments(text: string): string[] {
  const n = normalize(text)
  const out: string[] = []
  const ar = AR_FREE_OF.exec(n)
  if (ar?.[1]) out.push(ar[1])
  const en = EN_FREE_OF.exec(n)
  if (en?.[1]) out.push(en[1])
  return out
}
