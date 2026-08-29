import { Redirect } from 'expo-router'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useSession } from '../lib/auth/session'
import { useProfile } from '../lib/data/queries'
import { colors } from '../lib/theme'

/**
 * Signed out goes to sign-in, no profile goes to onboarding, everyone else goes
 * to today. With no backend configured there is nothing to sign in to, so that
 * branch never appears rather than showing an empty formality.
 *
 * The signed-out check comes before the profile wait on purpose. Reading a
 * profile while signed out is a request RLS refuses, and waiting on its retry
 * cycle put six seconds of blank screen in front of the sign-in form.
 */
export default function Index() {
  const { data: session, isPending: sessionPending } = useSession()
  const signedOut = session?.required === true && session.userId === null
  const { data: profile, isPending: profilePending } = useProfile({
    enabled: session !== undefined && !signedOut,
  })

  if (sessionPending) return <Spinner />
  if (signedOut) return <Redirect href="/(auth)/sign-in" />
  // An unreachable backend leaves `profile` undefined once the retries are
  // spent, which lands on onboarding — where the first save reports the real
  // problem instead of spinning forever.
  if (profilePending) return <Spinner />

  return <Redirect href={profile ? '/(tabs)/today' : '/(onboarding)/welcome'} />
}

function Spinner() {
  return (
    <View style={s.center}>
      <ActivityIndicator color={colors.lime} />
    </View>
  )
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
})
