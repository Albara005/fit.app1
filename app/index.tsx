import { Redirect } from 'expo-router'
import { ActivityIndicator, View, StyleSheet } from 'react-native'
import { useProfile } from '../lib/data/queries'
import { colors } from '../lib/theme'

/** Sends a returning user straight to today and a new one to onboarding. */
export default function Index() {
  const { data: profile, isPending } = useProfile()

  if (isPending) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.lime} />
      </View>
    )
  }

  return <Redirect href={profile ? '/(tabs)/today' : '/(onboarding)/welcome'} />
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
})
