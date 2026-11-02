import { Stack } from 'expo-router'
import { useTheme } from '../../lib/design/theme'

export default function AuthLayout() {
  const { p } = useTheme()
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.bg } }} />
}
