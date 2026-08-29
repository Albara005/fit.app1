import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useMemo } from 'react'
import { I18nManager, Platform } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { LockGate } from '../components/LockGate'
import { useT } from '../lib/i18n/useT'
import { useSettings } from '../lib/store/settings'
import { colors } from '../lib/theme'

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

export default function RootLayout() {
  const locale = useSettings((s) => s.locale)
  const { t } = useT()
  useDirection(locale === 'ar')

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

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <LockGate>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.text,
              headerTitleStyle: { fontWeight: '700' },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.bg },
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
            <Stack.Screen
              name="review"
              options={{ presentation: 'modal', title: t('review.title') }}
            />
            <Stack.Screen
              name="phase"
              options={{ presentation: 'modal', title: t('phase.title') }}
            />
            <Stack.Screen name="privacy" options={{ title: t('privacy.title') }} />
            <Stack.Screen
              name="meal/photo"
              options={{ presentation: 'modal', title: t('meals.photo') }}
            />
          </Stack>
        </LockGate>
      </SafeAreaProvider>
    </QueryClientProvider>
  )
}
