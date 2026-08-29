import { type ReactNode } from 'react'
import { useState } from 'react'
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextStyle, type ViewStyle,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, radius, space, type } from '../lib/theme'

/**
 * Every spacing and alignment prop here is logical (start/end), never physical
 * (left/right). Arabic is the first language, so a layout that only works
 * left-to-right is a broken layout, not a localisation task for later.
 *
 * Text alignment is deliberately unset rather than set to 'left': the platform
 * default already follows the writing direction on both React Native and the
 * web, and naming a side is how a layout stops flipping.
 */

export function Screen({
  children, scroll = true, footer,
}: {
  children: ReactNode
  scroll?: boolean
  footer?: ReactNode
}) {
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={s.scrollBody}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={s.scrollBody}>{children}</View>
  )

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      {body}
      {footer ? <View style={s.footer}>{footer}</View> : null}
    </SafeAreaView>
  )
}

export function Title({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.title, style]}>{children}</Text>
}

export function Display({ children }: { children: ReactNode }) {
  return <Text style={s.display}>{children}</Text>
}

export function Body({ children, muted = true, style }: { children: ReactNode; muted?: boolean; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.body, muted && s.bodyMuted, style]}>{children}</Text>
}

export function Small({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.small, style]}>{children}</Text>
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <View style={s.sectionTitle}>
      <Text style={s.heading}>{children}</Text>
      {action}
    </View>
  )
}

export function Card({
  children, tone = 'default', style,
}: {
  children: ReactNode
  tone?: 'default' | 'accent' | 'danger'
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View style={[s.card, tone === 'accent' && s.cardAccent, tone === 'danger' && s.cardDanger, style]}>
      {children}
    </View>
  )
}

export function Button({
  label, onPress, variant = 'primary', disabled, loading, style,
}: {
  label: string
  onPress?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  disabled?: boolean
  loading?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const isDisabled = disabled || loading
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        s.button,
        variant === 'primary' && s.buttonPrimary,
        variant === 'secondary' && s.buttonSecondary,
        variant === 'ghost' && s.buttonGhost,
        variant === 'danger' && s.buttonDanger,
        pressed && !isDisabled && s.pressed,
        isDisabled && s.buttonDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.bg : colors.text} />
      ) : (
        <Text
          style={[
            s.buttonLabel,
            variant === 'primary' && s.buttonLabelPrimary,
            variant === 'danger' && s.buttonLabelDanger,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  )
}

export function Chip({
  label, selected, onPress, sublabel, wide,
}: {
  label: string
  selected: boolean
  onPress: () => void
  sublabel?: string
  /** Takes a full row. Options with a description read as a list, not a cloud. */
  wide?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        s.chip,
        wide && s.chipWide,
        selected && s.chipSelected,
        pressed && s.pressed,
      ]}
    >
      <Text style={[s.chipLabel, selected && s.chipLabelSelected]}>{label}</Text>
      {sublabel ? <Text style={[s.chipSub, selected && s.chipSubSelected]}>{sublabel}</Text> : null}
    </Pressable>
  )
}

/**
 * react-native-web draws a white browser focus ring that ignores the palette.
 * Suppressing it is only acceptable because the focused border below replaces
 * it — removing the ring without a replacement breaks keyboard navigation.
 */
const noOutline = { outlineStyle: 'none' } as unknown as ViewStyle

export function Input({
  value, onChangeText, placeholder, inputMode, invalid, style,
}: {
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  inputMode?: 'text' | 'numeric' | 'decimal'
  /** Marked only after a failed submit; nagging while typing is not help. */
  invalid?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const [focused, setFocused] = useState(false)
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={placeholder}
      placeholderTextColor={colors.textFaint}
      inputMode={inputMode}
      accessibilityState={{ disabled: false }}
      style={[s.input, noOutline, focused && s.inputFocused, invalid && s.inputInvalid, style]}
    />
  )
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.row, style]}>{children}</View>
}

export function Wrap({ children }: { children: ReactNode }) {
  return <View style={s.wrap}>{children}</View>
}

/** 1–5 pickers. Labelled at the ends only: the middle needs no explaining. */
export function Scale({
  value, onChange, lowLabel, highLabel,
}: {
  value: number
  onChange: (value: number) => void
  lowLabel: string
  highLabel: string
}) {
  return (
    <View>
      <View style={s.scaleRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            accessibilityRole="radio"
            accessibilityState={{ selected: value === n }}
            accessibilityLabel={String(n)}
            onPress={() => onChange(n)}
            style={({ pressed }) => [s.scaleDot, value === n && s.scaleDotOn, pressed && s.pressed]}
          >
            <Text style={[s.scaleNum, value === n && s.scaleNumOn]}>{n}</Text>
          </Pressable>
        ))}
      </View>
      <View style={s.scaleLabels}>
        <Small style={s.scaleLabel}>{lowLabel}</Small>
        <Small style={s.scaleLabel}>{highLabel}</Small>
      </View>
    </View>
  )
}

export function Stepper({
  value, onChange, min, max, step = 1, suffix,
}: {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  suffix?: string
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n * 10) / 10))
  return (
    <View style={s.stepper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="-"
        onPress={() => onChange(clamp(value - step))}
        style={({ pressed }) => [s.stepperBtn, pressed && s.pressed]}
      >
        <Text style={s.stepperSign}>−</Text>
      </Pressable>
      <View style={s.stepperValue}>
        <Text style={s.stepperNum}>{value}</Text>
        {suffix ? <Text style={s.stepperSuffix}>{suffix}</Text> : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="+"
        onPress={() => onChange(clamp(value + step))}
        style={({ pressed }) => [s.stepperBtn, pressed && s.pressed]}
      >
        <Text style={s.stepperSign}>+</Text>
      </Pressable>
    </View>
  )
}

export function Meter({ value, max, tone = 'lime' }: { value: number; max: number; tone?: 'lime' | 'sand' | 'warn' }) {
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  const fill = tone === 'sand' ? colors.sand : tone === 'warn' ? colors.warn : colors.lime
  return (
    <View style={s.meter}>
      <View style={[s.meterFill, { width: `${pct * 100}%`, backgroundColor: fill }]} />
    </View>
  )
}

export function Stat({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <View style={s.stat}>
      <Text style={s.statValue}>
        {value}
        {unit ? <Text style={s.statUnit}> {unit}</Text> : null}
      </Text>
      <Small style={s.statLabel}>{label}</Small>
    </View>
  )
}

/** Explains a change rather than announcing one. The coach's voice, in a box. */
export function CoachNote({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'warn' }) {
  return (
    <View style={s.coach}>
      <View style={[s.coachBar, tone === 'warn' && s.coachBarWarn]} />
      <Text style={s.coachText}>{children}</Text>
    </View>
  )
}

export function Divider() {
  return <View style={s.divider} />
}

export function Spacer({ size = space.lg }: { size?: number }) {
  return <View style={{ height: size }} />
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scrollBody: { padding: space.lg, paddingBottom: space.xxl, gap: space.md, flexGrow: 1 },
  footer: {
    padding: space.lg,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    backgroundColor: colors.bg,
    gap: space.sm,
  },

  display: { ...type.display, color: colors.text },
  title: { ...type.title, color: colors.text },
  heading: { ...type.heading, color: colors.text },
  body: { ...type.body, color: colors.text, lineHeight: 23 },
  bodyMuted: { color: colors.textMute },
  small: { ...type.small, color: colors.textMute },

  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.sm,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.line,
    gap: space.sm,
  },
  cardAccent: { backgroundColor: colors.limeSoft, borderColor: colors.limeDim },
  cardDanger: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },

  button: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  buttonPrimary: { backgroundColor: colors.lime },
  buttonSecondary: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.line },
  buttonGhost: { backgroundColor: 'transparent' },
  buttonDanger: { backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: colors.danger },
  buttonDisabled: { opacity: 0.4 },
  buttonLabel: { ...type.body, fontWeight: '700', color: colors.text },
  buttonLabelPrimary: { color: colors.bg },
  buttonLabelDanger: { color: colors.danger },
  pressed: { opacity: 0.75 },

  chip: {
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    minWidth: 92,
    gap: 2,
  },
  chipWide: { width: '100%' },
  chipSelected: { backgroundColor: colors.limeSoft, borderColor: colors.lime },
  chipLabel: { ...type.body, color: colors.text },
  chipLabelSelected: { color: colors.lime, fontWeight: '700' },
  chipSub: { ...type.micro, color: colors.textFaint },
  chipSubSelected: { color: colors.limeDim },

  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },

  scaleRow: { flexDirection: 'row', gap: space.sm },
  scaleDot: {
    flex: 1,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleDotOn: { backgroundColor: colors.lime, borderColor: colors.lime },
  scaleNum: { ...type.body, fontWeight: '700', color: colors.textMute },
  scaleNumOn: { color: colors.bg },
  scaleLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.xs },
  scaleLabel: { color: colors.textFaint },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  stepperBtn: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  stepperSign: { fontSize: 24, fontWeight: '700', color: colors.lime },
  stepperValue: { flex: 1, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 4 },
  stepperNum: { ...type.title, color: colors.text },
  stepperSuffix: { ...type.small, color: colors.textMute },

  meter: { height: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  meterFill: { height: '100%', borderRadius: radius.pill },

  stat: { gap: 2 },
  statValue: { ...type.title, color: colors.text },
  statUnit: { ...type.small, color: colors.textMute },
  statLabel: { color: colors.textFaint },

  coach: { flexDirection: 'row', gap: space.md, alignItems: 'stretch' },
  coachBar: { width: 3, borderRadius: radius.pill, backgroundColor: colors.lime },
  coachBarWarn: { backgroundColor: colors.warn },
  coachText: { ...type.body, color: colors.text, flex: 1, lineHeight: 23 },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginVertical: space.sm },

  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: space.lg,
    minHeight: 52,
    color: colors.text,
    ...type.body,
  },
  inputFocused: { borderColor: colors.lime },
  inputInvalid: { borderColor: colors.danger },
})
