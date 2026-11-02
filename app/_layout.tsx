import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useMemo } from 'react'
import { I18nManager, Platform, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { LockGate } from '../components/LockGate'
import { useTheme } from '../lib/design/theme'
import { fonts } from '../lib/design/tokens'
import { type } from '../lib/design/typography'
import { useT } from '../lib/i18n/useT'
import { useSettings } from '../lib/store/settings'

/**
 * On the web the document direction is what actually flips the layout, and it
 * has to change the moment the language does. On native I18nManager needs a
 * reload to take effect, so the flag is set and the next launch honours it —
 * forcing a restart on a language toggle is worse than one screen of transition.
 */
function useDirection(rtl: boolean) {
  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof document !== 'undefined') {
        document.documentElement.dir = rtl ? 'rtl' : 'ltr'
        document.documentElement.lang = rtl ? 'ar' : 'en'
      }
      return
    }
    if (I18nManager.isRTL !== rtl) {
      I18nManager.allowRTL(rtl)
      I18nManager.forceRTL(rtl)
    }
  }, [rtl])
}

/**
 * The browser's default focus ring ignores the palette, and on the dark ground
 * it can all but disappear. One rule replaces it for keyboard focus only
 * (`:focus-visible`), so a tap never leaves a ring behind. The page's own
 * background and colour scheme follow the theme too, so overscroll and native
 * scrollbars do not flash the other one.
 */
function useWebChrome(focus: string, bg: string, scheme: 'light' | 'dark') {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return
    let el = document.getElementById('fit-focus') as HTMLStyleElement | null
    if (!el) {
      el = document.createElement('style')
      el.id = 'fit-focus'
      document.head.appendChild(el)
    }
    el.textContent =
      `[tabindex]:focus-visible, button:focus-visible, a:focus-visible, [role="switch"]:focus-visible ` +
      `{ outline: 2px solid ${focus} !important; outline-offset: 2px; border-radius: 12px; }`
    document.body.style.backgroundColor = bg
    document.documentElement.style.colorScheme = scheme
  }, [focus, bg, scheme])
}

export default function RootLayout() {
  const locale = useSettings((s) => s.locale)
  const { t } = useT()
  const { name, p } = useTheme()
  useDirection(locale === 'ar')
  useWebChrome(p.focus, p.bg, name)

  // Three weight files, each registered under its own family name.
  const [fontsLoaded, fontError] = useFonts({
    [fonts.display]: require('../assets/fonts/NotoKufiArabic_700Bold.ttf'),
    [fonts.body]: require('../assets/fonts/NotoSansArabic_400Regular.ttf'),
    [fonts.bodyBold]: require('../assets/fonts/NotoSansArabic_700Bold.ttf'),
  })

  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            // The plan is on screen; refetching it because a window regained
            // focus is churn the user did not ask for.
            refetchOnWindowFocus: false,
          },
        },
      }),
    [],
  )

  // Local files, so this is a frame or two. Painting before they land would
  // flash every line in the fallback face; a failure paints anyway, in the
  // fallback, rather than leaving a blank screen.
  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: p.bg }} />

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style={name === 'dark' ? 'light' : 'dark'} />
        <LockGate>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: p.bg },
              headerTintColor: p.text,
              headerTitleStyle: { fontFamily: type.heading.fontFamily, fontSize: type.heading.fontSize },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: p.bg },
              animation: 'fade',
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            {/* Without an explicit title the header falls back to the route
                path, so a modal opens with "workout/[dayId]" across the top. */}
            <Stack.Screen
              name="workout/[dayId]"
              options={{ presentation: 'modal', title: t('workout.title') }}
            />
            <Stack.Screen name="review" options={{ presentation: 'modal', title: t('review.title') }} />
            <Stack.Screen name="phase" options={{ presentation: 'modal', title: t('phase.title') }} />
            <Stack.Screen name="privacy" options={{ title: t('privacy.title') }} />
            <Stack.Screen name="meal/photo" options={{ presentation: 'modal', title: t('meals.photo') }} />
            <Stack.Screen name="meal/label" options={{ presentation: 'modal', title: t('meals.labelTitle') }} />
          </Stack>
        </LockGate>
      </SafeAreaProvider>
    </QueryClientProvider>
  )
}
