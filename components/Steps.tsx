import { StyleSheet, View } from 'react-native'
import { colors, radius, space } from '../lib/theme'

/** Nine dots, not a percentage. A percentage invites arithmetic mid-form. */
export function Steps({ current, total }: { current: number; total: number }) {
  return (
    <View style={s.row} accessibilityLabel={`${current} / ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[s.dot, i < current && s.dotDone]} />
      ))}
    </View>
  )
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.xs, marginBottom: space.sm },
  dot: { flex: 1, height: 3, borderRadius: radius.pill, backgroundColor: colors.line },
  dotDone: { backgroundColor: colors.lime },
})
