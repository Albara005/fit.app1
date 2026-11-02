import { StyleSheet, Text, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { useTheme } from '../lib/design/theme'
import { palettes, radius, space } from '../lib/design/tokens'
import { type } from '../lib/design/typography'

/**
 * The mark, reduced to what survives at 24px: a complete lime "D" with the peak
 * leaning against it. An earlier version ran the peak through the D's stem,
 * which cost the stem and left the glyph reading as "7D" at tab-bar size. The
 * app icons in assets/ are rendered from these same two paths.
 *
 * The mark is never recoloured. On a light ground it sits on its own dark tile —
 * the app icon's composition — because lime on white is barely there (1.5:1).
 */
export function PeakMark({ size = 40 }: { size?: number }) {
  const { name } = useTheme()
  const ink = palettes.dark
  const glyph = (
    <Svg
      width={name === 'light' ? size * 0.72 : size}
      height={name === 'light' ? size * 0.72 : size}
      viewBox="0 0 48 48"
      accessibilityLabel="Peak Fitness"
    >
      <Path d="M14 5h11c11 0 18 7.6 18 19s-7 19-18 19h-11V33h10c5.2 0 8.6-3.7 8.6-9S29.2 15 24 15H14z" fill={ink.accentFill} />
      <Path d="M4 43 15 17l6.6 15.6-5.4 2.3L15 30l-5 13z" fill={ink.sand} />
    </Svg>
  )
  if (name === 'dark') return glyph
  return (
    <View style={[s.tile, { width: size, height: size, borderRadius: size * 0.22 }]}>{glyph}</View>
  )
}

export function Wordmark({ size = 40 }: { size?: number }) {
  const { p } = useTheme()
  return (
    <View style={s.wordmark}>
      <PeakMark size={size} />
      {/* Latin, and a logotype: the one place tracking is allowed. */}
      <View aria-hidden>
        <Text style={[s.peak, { color: p.sand }]}>PEAK</Text>
        <Text style={[s.fitness, { color: p.accent }]}>FITNESS</Text>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  tile: { backgroundColor: palettes.dark.bg, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  wordmark: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  peak: { fontFamily: type.title.fontFamily, fontSize: 22, lineHeight: 28, letterSpacing: 3 },
  fitness: { fontFamily: type.label.fontFamily, fontSize: 11, lineHeight: 14, letterSpacing: 6 },
})
