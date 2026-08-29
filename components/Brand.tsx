import { StyleSheet, Text, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { colors, space, type } from '../lib/theme'

/**
 * The mark, reduced to what survives at 24px: a complete lime "D" with the peak
 * leaning against it. An earlier version ran the peak through the D's stem,
 * which cost the stem and left the glyph reading as "7D" at tab-bar size. The
 * full illustration belongs on the store listing, not in a navigation bar.
 */
export function PeakMark({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityLabel="Peak">
      <Path
        d="M14 5h11c11 0 18 7.6 18 19s-7 19-18 19h-11V33h10c5.2 0 8.6-3.7 8.6-9S29.2 15 24 15H14z"
        fill={colors.lime}
      />
      <Path d="M4 43 15 17l6.6 15.6-5.4 2.3L15 30l-5 13z" fill={colors.sand} />
    </Svg>
  )
}

export function Wordmark({ size = 40 }: { size?: number }) {
  return (
    <View style={s.wordmark}>
      <PeakMark size={size} />
      <View>
        <Text style={s.peak}>PEAK</Text>
        <Text style={s.fitness}>FITNESS</Text>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  wordmark: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  peak: { ...type.title, color: colors.sand, letterSpacing: 3 },
  fitness: { ...type.micro, color: colors.lime, letterSpacing: 6 },
})
