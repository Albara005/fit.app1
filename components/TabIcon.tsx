import { StyleSheet, View } from 'react-native'
import { useTheme } from '../lib/design/theme'
import { useT } from '../lib/i18n/useT'
import { Icon } from './Icon'

export type TabName = 'today' | 'meals' | 'plan' | 'profile'

/**
 * Line glyphs rather than the navigator's default placeholder, which renders a
 * blue triangle on the web — off-brand and meaningless.
 */
export function TabIcon({
  name, focused, badge,
}: {
  name: TabName
  focused: boolean
  /** A quiet dot, not a count: there is only ever one new plan. */
  badge?: boolean
}) {
  const { rtl } = useT()
  const { p } = useTheme()
  return (
    <View>
      <Icon name={name} color={focused ? p.accent : p.textMuted} />
      {/* The one place in this app that names a side, and only because it has
          to: react-native-web resolves both `insetInlineEnd` and `end` to a
          physical `right` when the stylesheet is built, so neither follows the
          document direction at runtime. The side is derived from the locale
          instead, which the app already knows. */}
      {badge ? <View style={[s.dot, { backgroundColor: p.primary }, rtl ? s.dotStart : s.dotEnd]} /> : null}
    </View>
  )
}

const s = StyleSheet.create({
  dot: { position: 'absolute', top: -2, width: 8, height: 8, borderRadius: 4 },
  dotEnd: { right: -3 },
  dotStart: { left: -3 },
})
