import { Stack, router, useSegments } from 'expo-router'
import { useEffect } from 'react'
import { useProfile } from '../../lib/data/queries'
import { useTheme } from '../../lib/design/theme'
import { useOnboarding } from '../../lib/store/onboarding'

/** The two screens that never read the draft: one starts it, one runs after it is saved. */
const OUTSIDE_DRAFT = new Set(['welcome', 'generating'])

export default function OnboardingLayout() {
  const { p } = useTheme()
  const started = useOnboarding((state) => state.started)
  const segments = useSegments()
  const screen = segments[segments.length - 1] ?? ''
  const { data: profile, isPending } = useProfile()

  // The draft lives in memory. A reload — or a typed URL — on any step leaves
  // it holding the defaults: a stranger's age and weight, and both safety
  // questions unanswered. Saved from there it would write allergies: [] over
  // the real list. Such a draft is nobody's answers, so every step is guarded
  // here at once: restore what is saved, if anything, and start from the top.
  const orphaned = !started && !OUTSIDE_DRAFT.has(screen)
  useEffect(() => {
    if (!orphaned || isPending) return
    const draft = useOnboarding.getState()
    if (profile) draft.hydrate(profile)
    else draft.reset()
    router.replace('/(onboarding)/basics')
  }, [orphaned, isPending, profile])

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: p.bg },
        animation: 'slide_from_right',
      }}
    />
  )
}
