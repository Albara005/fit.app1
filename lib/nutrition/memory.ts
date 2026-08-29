import type { CookMethod, Locale, PortionSize } from '../types'
import { normalize } from '../safety/text'

export interface Correction {
  dishKey: string
  kcal: number
  portion: PortionSize | null
  cookMethod: CookMethod | null
  /** City, not address. Cooking oil habits vary by place; people do not. */
  city: string | null
  correctedAt: string
}

/** Corrections are the moat. Three of them beat any general-purpose model. */
export const CORRECTIONS_BEFORE_MEMORY = 3

export function dishKey(label: string): string {
  return normalize(label).replace(/\s+/g, '_')
}

export interface DishMemory {
  dishKey: string
  kcal: number
  samples: number
  portion: PortionSize | null
  cookMethod: CookMethod | null
}

/**
 * A trimmed mean over the user's own corrections for one dish. Trimmed because
 * a single mistyped entry should not move what we tell them for months.
 */
export function recall(corrections: readonly Correction[], key: string): DishMemory | null {
  const mine = corrections.filter((c) => c.dishKey === key)
  if (mine.length < CORRECTIONS_BEFORE_MEMORY) return null

  const sorted = [...mine].sort((a, b) => a.kcal - b.kcal)
  const trim = sorted.length >= 5 ? 1 : 0
  const kept = sorted.slice(trim, sorted.length - trim)
  const kcal = Math.round(kept.reduce((s, c) => s + c.kcal, 0) / kept.length)

  const latest = mine.reduce((a, b) => (a.correctedAt > b.correctedAt ? a : b))

  return {
    dishKey: key,
    kcal,
    samples: mine.length,
    portion: latest.portion,
    cookMethod: latest.cookMethod,
  }
}

export function memoryLine(label: string, memory: DishMemory, locale: Locale): string {
  return locale === 'ar'
    ? `${label} عندك عادةً ${memory.kcal} سعرة.`
    : `Your ${label} usually runs ${memory.kcal} kcal.`
}
