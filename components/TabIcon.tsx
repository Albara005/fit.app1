import { StyleSheet, View } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'
import { useT } from '../lib/i18n/useT'
import { colors } from '../lib/theme'

export type TabName = 'today' | 'meals' | 'plan' | 'profile'

const PATHS: Record<TabName, string> = {
  today: 'M4 5h16v15H4zM4 10h16M8 3v4M16 3v4M9 15l2 2 4-4',
  meals: 'M4 12h16a8 8 0 0 1-16 0zM3 20h18M8 3v5M11 3v5M8 8h3',
  plan: 'M5 4h14v16H5zM9 9h7M9 13h7M9 17h4',
  profile: 'M4 20a8 8 0 0 1 16 0',
}

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
  const stroke = focused ? colors.lime : colors.textMute
  return (
    <View>
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Path
          d={PATHS[name]}
          stroke={stroke}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {name === 'profile' ? <Circle cx={12} cy={8} r={4} stroke={stroke} strokeWidth={1.8} /> : null}
      </Svg>
      {/* The one place in this app that names a side, and only because it has
          to: react-native-web resolves both `insetInlineEnd` and `end` to a
          physical `right` when the stylesheet is built, so neither follows the
          document direction at runtime. The side is derived from the locale
          instead, which the app already knows. */}
      {badge ? <View style={[s.dot, rtl ? s.dotStart : s.dotEnd]} /> : null}
    </View>
  )
}

const s = StyleSheet.create({
  dot: {
    position: 'absolute',
    top: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.lime,
  },
  dotEnd: { right: -3 },
  dotStart: { left: -3 },
})
