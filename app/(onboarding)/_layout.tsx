import { Stack } from 'expo-router'
import { useTheme } from '../../lib/design/theme'

export default function OnboardingLayout() {
  const { p } = useTheme()
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
