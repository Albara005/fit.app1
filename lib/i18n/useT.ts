import { useMemo } from 'react'
import { makeT, type TFunction } from './index'
import { useSettings } from '../store/settings'
import type { Locale } from '../types'

export function useT(): { t: TFunction; locale: Locale; rtl: boolean } {
  const locale = useSettings((s) => s.locale)
  const t = useMemo(() => makeT(locale), [locale])
  return { t, locale, rtl: locale === 'ar' }
}
