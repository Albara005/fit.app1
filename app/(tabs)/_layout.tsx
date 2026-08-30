import { Tabs } from 'expo-router'
import { StyleSheet, Text } from 'react-native'
import { TabIcon, type TabName } from '../../components/TabIcon'
import { usePlan } from '../../lib/data/queries'
import { useT } from '../../lib/i18n/useT'
import { useSettings } from '../../lib/store/settings'
import { colors, space, type } from '../../lib/theme'

function Label({ children, focused }: { children: string; focused: boolean }) {
  return <Text style={[s.label, focused && s.labelOn]}>{children}</Text>
}

const TABS: { name: TabName; titleKey: string }[] = [
  { name: 'today', titleKey: 'today.title' },
  { name: 'meals', titleKey: 'meals.title' },
  { name: 'plan', titleKey: 'plan.title' },
  { name: 'profile', titleKey: 'profile.title' },
]

export default function TabsLayout() {
  const { t } = useT()
  const { data: plan } = usePlan()
  const lastSeenPlanWeek = useSettings((state) => state.lastSeenPlanWeek)

  // Generation is a job the user can walk away from, so something has to tell
  // them it finished. A dot on the tab does that without a notifications
  // permission prompt, and without a library this project has not approved.
  const unseenPlan = plan !== null && plan !== undefined && plan.weekIndex > lastSeenPlanWeek

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '700' },
        sceneStyle: { backgroundColor: colors.bg },
        tabBarStyle: s.bar,
        tabBarItemStyle: { paddingVertical: space.xs },
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
            tabBarLabel: ({ focused }) => <Label focused={focused}>{t(tab.titleKey)}</Label>,
          }}
        />
      ))}
    </Tabs>
  )
}

const s = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.line,
    borderTopWidth: StyleSheet.hairlineWidth,
    height: 64,
    paddingTop: space.xs,
  },
  label: { ...type.micro, color: colors.textMute },
  labelOn: { color: colors.lime },
})
