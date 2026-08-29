import { StyleSheet, Text, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { colors, space, type } from '../lib/theme'

/**
 * The mark, reduced to what survives at 28px: the lime arc of the "D" and a
 * peak rising out of it. The full illustration belongs on the store listing,
 * not in a navigation bar.
 */
export function PeakMark({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityLabel="Peak">
      <Path
        d="M10 6h16c9.4 0 16 7.6 16 18s-6.6 18-16 18h-4v-9h3.4c4.6 0 7.6-3.8 7.6-9s-3-9-7.6-9H10z"
        fill={colors.lime}
      />
      <Path d="M6 42 20 12l6 13-4 2-2-4.4L14 42z" fill={colors.sand} />
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
