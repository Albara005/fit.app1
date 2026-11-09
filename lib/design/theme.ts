import { useSyncExternalStore } from 'react'
import { Appearance, StyleSheet } from 'react-native'
import { useSettings } from '../store/settings'
import { palettes, type Palette, type ThemeName } from './tokens'

/*
 * One listener on the device's light/dark setting for the whole app.
 * react-native-web's useColorScheme removes and re-adds a media-query listener
 * on every render of every component that calls it — and every styled
 * component asks for the theme.
 */
const subscribers = new Set<() => void>()
let listening = false

function subscribe(onChange: () => void): () => void {
  subscribers.add(onChange)
  if (!listening) {
    listening = true
    Appearance.addChangeListener(() => {
      for (const notify of subscribers) notify()
    })
  }
  return () => {
    subscribers.delete(onChange)
  }
}

const systemScheme = () => Appearance.getColorScheme()

/**
 * The user's choice wins; otherwise the device decides. With no device
 * preference at all (some browsers report none) the brand's own dark ground is
 * the default — it is what the splash and the icon already show.
 */
export function useThemeName(): ThemeName {
  const preference = useSettings((s) => s.theme)
  const system = useSyncExternalStore(subscribe, systemScheme, systemScheme)
  if (preference !== 'system') return preference
  return system === 'light' ? 'light' : 'dark'
}

export function useTheme(): { name: ThemeName; p: Palette } {
  const name = useThemeName()
  return { name, p: palettes[name] }
}

/**
 * Styles that depend on colour. The factory runs once per theme, not per
 * render: there are two palettes, so there are at most two stylesheets.
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (p: Palette) => T): () => T {
  const cache = new Map<ThemeName, T>()
  return function useStyles(): T {
    const name = useThemeName()
    let sheet = cache.get(name)
    if (!sheet) {
      sheet = StyleSheet.create(factory(palettes[name]))
      cache.set(name, sheet)
    }
    return sheet
  }
}
