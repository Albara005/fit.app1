import { Tabs } from 'expo-router'
import { StyleSheet, Text } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { TabIcon, type TabName } from '../../components/TabIcon'
import { usePlan } from '../../lib/data/queries'
import { useTheme } from '../../lib/design/theme'
import { space } from '../../lib/design/tokens'
import { type } from '../../lib/design/typography'
import { useT } from '../../lib/i18n/useT'
import { useSettings } from '../../lib/store/settings'

const TABS: { name: TabName; titleKey: string }[] = [
  { name: 'today', titleKey: 'today.title' },
  { name: 'meals', titleKey: 'meals.title' },
  { name: 'plan', titleKey: 'plan.title' },
  { name: 'profile', titleKey: 'profile.title' },
]

/** Room for a 24px glyph and one line of caption, above whatever the device reserves. */
const BAR = 60

export default function TabsLayout() {
  const { t } = useT()
  const { p } = useTheme()
  const insets = useSafeAreaInsets()
  const { data: plan } = usePlan()
  const lastSeenPlanWeek = useSettings((state) => state.lastSeenPlanWeek)

  // Generation is a job the user can walk away from, so something has to tell
  // them it finished. A dot on the tab does that without a notifications
  // permission prompt.
  const unseenPlan = plan !== null && plan !== undefined && plan.weekIndex > lastSeenPlanWeek

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: p.bg },
        headerTintColor: p.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: type.heading.fontFamily, fontSize: type.heading.fontSize },
        sceneStyle: { backgroundColor: p.bg },
        tabBarStyle: {
          backgroundColor: p.surface,
          borderTopColor: p.line,
          borderTopWidth: StyleSheet.hairlineWidth,
          // A fixed height squeezed the icons into whatever the home indicator
          // left over. The inset is added, not absorbed.
          height: BAR + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: space.xs,
        },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.titleKey),
            tabBarIcon: ({ focused }) => (
              <TabIcon name={tab.name} focused={focused} badge={tab.name === 'plan' && unseenPlan} />
            ),
            tabBarLabel: ({ focused }) => (
              <Text style={[type.caption, { color: focused ? p.accent : p.textMuted }]}>{t(tab.titleKey)}</Text>
            ),
          }}
        />
      ))}
    </Tabs>
  )
}
