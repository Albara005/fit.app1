import { Platform } from 'react-native'
import { type as base } from './tokens'

/**
 * On the web a family name the browser does not know falls through to its
 * default serif. The fonts are awaited before first paint, but if loading fails
 * the app should still read as Arabic, not as Times. Native has no font stacks;
 * an unknown family there already falls back to the system face.
 */
const WEB_FALLBACK = ', system-ui, -apple-system, "Segoe UI", sans-serif'

export const type: typeof base =
  Platform.OS === 'web'
    ? (Object.fromEntries(
        Object.entries(base).map(([k, v]) => [k, { ...v, fontFamily: v.fontFamily + WEB_FALLBACK }]),
      ) as typeof base)
    : base
