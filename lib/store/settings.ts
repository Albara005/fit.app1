import { create } from 'zustand'
import { getLocales } from 'expo-localization'
import { kv, readJson, writeJson } from '../data/kv'
import type { Locale } from '../types'

interface SettingsState {
  locale: Locale
  lockEnabled: boolean
  unlocked: boolean
  setLocale: (locale: Locale) => void
  setLockEnabled: (enabled: boolean) => void
  setUnlocked: (unlocked: boolean) => void
}

const KEY = 'settings'

/** Arabic is the default, and English is opt-in — not the other way round. */
function initialLocale(): Locale {
  const stored = readJson<{ locale?: Locale }>(kv, KEY, {}).locale
  if (stored === 'ar' || stored === 'en') return stored
  try {
    return getLocales()[0]?.languageCode === 'en' ? 'en' : 'ar'
  } catch {
    return 'ar'
  }
}

export const useSettings = create<SettingsState>((set, get) => ({
  locale: initialLocale(),
  lockEnabled: readJson<{ lockEnabled?: boolean }>(kv, KEY, {}).lockEnabled ?? false,
  unlocked: false,
  setLocale: (locale) => {
    set({ locale })
    writeJson(kv, KEY, { ...readJson(kv, KEY, {}), locale })
  },
  setLockEnabled: (lockEnabled) => {
    set({ lockEnabled, unlocked: get().unlocked || !lockEnabled })
    writeJson(kv, KEY, { ...readJson(kv, KEY, {}), lockEnabled })
  },
  setUnlocked: (unlocked) => set({ unlocked }),
}))
