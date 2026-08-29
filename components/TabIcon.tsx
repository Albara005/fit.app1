import Svg, { Circle, Path } from 'react-native-svg'
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
export function TabIcon({ name, focused }: { name: TabName; focused: boolean }) {
  const stroke = focused ? colors.lime : colors.textMute
  return (
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
  )
}
