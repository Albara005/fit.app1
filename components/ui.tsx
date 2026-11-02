import { type ReactNode, useEffect, useId, useRef, useState } from 'react'
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View,
  useWindowDimensions,
  type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { makeStyles, useTheme } from '../lib/design/theme'
import { layout, radius, space, touch } from '../lib/design/tokens'
import { type } from '../lib/design/typography'
import { useT } from '../lib/i18n/useT'
import { Icon, type IconName } from './Icon'

/**
 * Every spacing and alignment prop here is logical (start/end), never physical
 * (left/right). Arabic is the first language, so a layout that only works
 * left-to-right is a broken layout, not a localisation task for later.
 *
 * Text alignment is deliberately unset: the platform default already follows
 * the writing direction, and naming a side is how a layout stops flipping.
 */

/*
 * Accessibility state is passed as `aria-*` props, never `accessibilityState` or
 * `accessibilityValue`. React Native accepts both on iOS and Android, but
 * react-native-web 0.21 reads only the former: with `accessibilityState` every
 * selected option reached a browser screen reader as unselected.
 */

/** Joins parts of a spoken label with the comma of the language being read. */
function useJoin(): (...parts: (string | undefined)[]) => string {
  const { rtl } = useT()
  return (...parts) => parts.filter(Boolean).join(rtl ? '، ' : ', ')
}

// ── Layout ──────────────────────────────────────────────────────────────────

export function Screen({
  children, scroll = true, footer, center,
}: {
  children: ReactNode
  scroll?: boolean
  footer?: ReactNode
  /** Vertically centres a short screen — a lock, a wait, an empty state. */
  center?: boolean
}) {
  const s = useScreenStyles()
  const { width } = useWindowDimensions()
  const gutter = width >= layout.wideBreakpoint ? layout.gutterWide : layout.gutter
  const column = [s.column, { paddingHorizontal: gutter }, center && s.columnCenter]

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={s.scrollBody}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={column}>{children}</View>
        </ScrollView>
      ) : (
        <View style={s.scrollBody}>
          <View style={column}>{children}</View>
        </View>
      )}
      {/* In normal flow under the scroller, not floating over it, so the last
          line of content can never sit behind the buttons. */}
      {footer ? (
        <View style={s.footer}>
          <View style={[s.column, s.footerColumn, { paddingHorizontal: gutter }]}>{footer}</View>
        </View>
      ) : null}
    </SafeAreaView>
  )
}

const useScreenStyles = makeStyles((p) => ({
  screen: { flex: 1, backgroundColor: p.bg },
  scrollBody: { flexGrow: 1, paddingTop: space.lg, paddingBottom: space.xxl },
  column: { width: '100%', maxWidth: layout.maxContent, alignSelf: 'center', gap: space.md },
  columnCenter: { flex: 1, justifyContent: 'center' },
  footer: {
    paddingTop: space.md,
    paddingBottom: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: p.line,
    backgroundColor: p.bg,
  },
  footerColumn: { gap: space.sm },
}))

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[base.row, style]}>{children}</View>
}

export function Wrap({ children }: { children: ReactNode }) {
  return <View style={base.wrap}>{children}</View>
}

export function Grow() {
  return <View style={base.grow} />
}

export function Spacer({ size = space.lg }: { size?: number }) {
  return <View style={{ height: size }} />
}

export function Divider() {
  const s = useDividerStyles()
  return <View style={s.divider} />
}

const useDividerStyles = makeStyles((p) => ({
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: p.line, marginVertical: space.xs },
}))

const base = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  grow: { flex: 1 },
})

// ── Type ────────────────────────────────────────────────────────────────────

export function Display({ children }: { children: ReactNode }) {
  const s = useTextStyles()
  return <Text accessibilityRole="header" style={s.display}>{children}</Text>
}

export function Title({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const s = useTextStyles()
  return <Text accessibilityRole="header" style={[s.title, style]}>{children}</Text>
}

export function Heading({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const s = useTextStyles()
  return <Text accessibilityRole="header" style={[s.heading, style]}>{children}</Text>
}

export function Lead({ children }: { children: ReactNode }) {
  const s = useTextStyles()
  return <Text style={s.lead}>{children}</Text>
}

export function Body({
  children, muted, strong, style, selectable,
}: {
  children: ReactNode
  muted?: boolean
  strong?: boolean
  style?: StyleProp<TextStyle>
  selectable?: boolean
}) {
  const s = useTextStyles()
  return (
    <Text selectable={selectable} style={[strong ? s.bodyStrong : s.body, muted && s.muted, style]}>
      {children}
    </Text>
  )
}

export function Caption({
  children, style, strong,
}: {
  children: ReactNode
  style?: StyleProp<TextStyle>
  strong?: boolean
}) {
  const s = useTextStyles()
  return <Text style={[strong ? s.captionStrong : s.caption, style]}>{children}</Text>
}

export function Section({
  title, action, children,
}: {
  title: string
  action?: ReactNode
  children?: ReactNode
}) {
  const s = useTextStyles()
  return (
    <View style={s.section}>
      <View style={base.row}>
        <Heading style={base.grow}>{title}</Heading>
        {action}
      </View>
      {children}
    </View>
  )
}

const useTextStyles = makeStyles((p) => ({
  display: { ...type.display, color: p.text },
  title: { ...type.title, color: p.text },
  heading: { ...type.heading, color: p.text },
  lead: { ...type.lead, color: p.text },
  body: { ...type.body, color: p.text },
  bodyStrong: { ...type.bodyStrong, color: p.text },
  muted: { color: p.textMuted },
  caption: { ...type.caption, color: p.textMuted },
  captionStrong: { ...type.label, color: p.textMuted },
  section: { gap: space.sm, marginTop: space.md },
}))

// ── Surfaces ────────────────────────────────────────────────────────────────

export function Card({
  children, tone = 'default', style,
}: {
  children: ReactNode
  tone?: 'default' | 'raised' | 'danger' | 'warn'
  style?: StyleProp<ViewStyle>
}) {
  const s = useCardStyles()
  return (
    <View style={[s.card, tone === 'raised' && s.raised, tone === 'danger' && s.danger, tone === 'warn' && s.warn, style]}>
      {children}
    </View>
  )
}

const useCardStyles = makeStyles((p) => ({
  card: {
    backgroundColor: p.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: p.line,
    gap: space.sm,
  },
  raised: { backgroundColor: p.surfaceRaised },
  danger: { backgroundColor: p.dangerSoft, borderColor: p.danger },
  warn: { backgroundColor: p.warnSoft, borderColor: p.warn },
}))

/**
 * The coach's one sentence, and the only tinted surface on a screen. If two of
 * these compete on one screen, the screen is saying two things.
 */
export function CoachLine({
  label, children, tone = 'default',
}: {
  label?: string
  children: ReactNode
  tone?: 'default' | 'warn'
}) {
  const s = useCoachStyles()
  return (
    <View style={s.wrap}>
      {/* A separate view rather than a start border: a row flips with the
          writing direction everywhere, a logical border does not on the web. */}
      <View style={[s.bar, tone === 'warn' && s.barWarn]} />
      <View style={s.content}>
        {label ? <Text style={[s.label, tone === 'warn' && s.labelWarn]}>{label}</Text> : null}
        <Text style={s.text}>{children}</Text>
      </View>
    </View>
  )
}

const useCoachStyles = makeStyles((p) => ({
  wrap: {
    flexDirection: 'row',
    gap: space.md,
    backgroundColor: p.accentSoft,
    borderRadius: radius.lg,
    padding: space.lg,
  },
  bar: { width: 3, borderRadius: radius.pill, backgroundColor: p.accent },
  barWarn: { backgroundColor: p.warn },
  content: { flex: 1, gap: space.xs },
  label: { ...type.label, color: p.accent },
  labelWarn: { color: p.warn },
  text: { ...type.lead, color: p.text },
}))

export function Badge({ label, tone = 'default' }: { label: string; tone?: 'default' | 'accent' }) {
  const s = useBadgeStyles()
  return (
    <View style={[s.badge, tone === 'accent' && s.accent]}>
      <Text style={[s.text, tone === 'accent' && s.textAccent]}>{label}</Text>
    </View>
  )
}

const useBadgeStyles = makeStyles((p) => ({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.md,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: p.surfaceRaised,
  },
  accent: { backgroundColor: p.accentSoft },
  text: { ...type.caption, color: p.text },
  textAccent: { color: p.accent },
}))

// ── Actions ─────────────────────────────────────────────────────────────────

export function Button({
  label, onPress, variant = 'primary', icon, disabled, loading, style, hint,
}: {
  label: string
  onPress?: () => void
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger'
  icon?: IconName
  disabled?: boolean
  loading?: boolean
  style?: StyleProp<ViewStyle>
  /** Read by screen readers after the label, for a consequence the label cannot carry. */
  hint?: string
}) {
  const s = useButtonStyles()
  const { p } = useTheme()
  const inert = disabled || loading
  const ink =
    variant === 'primary' ? p.onPrimary : variant === 'danger' ? p.danger : variant === 'quiet' ? p.accent : p.text

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      aria-disabled={!!inert}
      aria-busy={!!loading}
      disabled={inert}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        s[variant],
        pressed && s.pressed,
        disabled && s.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={ink} />
      ) : (
        <View style={base.row}>
          {icon ? <Icon name={icon} color={ink} size={20} /> : null}
          <Text style={[s.label, { color: ink }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  )
}

const useButtonStyles = makeStyles((p) => ({
  button: {
    minHeight: 52,
    minWidth: touch.min,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  primary: { backgroundColor: p.primary },
  secondary: { backgroundColor: p.surface, borderWidth: 1, borderColor: p.lineStrong },
  quiet: { backgroundColor: 'transparent', minHeight: touch.min },
  danger: { backgroundColor: p.dangerSoft, borderWidth: 1, borderColor: p.danger },
  // Opacity, never scale: a pressed control that changes size moves its neighbours.
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.45 },
  label: { ...type.bodyStrong },
}))

export function ListRow({
  label, detail, onPress, icon,
}: {
  label: string
  detail?: string
  onPress: () => void
  icon?: IconName
}) {
  const s = useListStyles()
  const { p } = useTheme()
  const join = useJoin()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={join(label, detail)}
      onPress={onPress}
      style={({ pressed }) => [s.row, pressed && s.pressed]}
    >
      {icon ? <Icon name={icon} color={p.textMuted} /> : null}
      <View style={base.grow}>
        <Text style={s.label}>{label}</Text>
        {detail ? <Text style={s.detail}>{detail}</Text> : null}
      </View>
      <Icon name="chevron" color={p.textMuted} size={20} />
    </Pressable>
  )
}

export function SwitchRow({
  label, detail, value, onValueChange,
}: {
  label: string
  detail?: string
  value: boolean
  onValueChange: (value: boolean) => void
}) {
  const s = useListStyles()
  const { p } = useTheme()
  return (
    <View style={s.row}>
      <View style={base.grow}>
        <Text style={s.label}>{label}</Text>
        {detail ? <Text style={s.detail}>{detail}</Text> : null}
      </View>
      <Switch
        accessibilityLabel={label}
        accessibilityHint={detail}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: p.lineStrong, true: p.primary }}
        thumbColor={p.surface}
        // react-native-web's own prop for the thumb when on.
        {...({ activeThumbColor: p.onPrimary } as object)}
      />
    </View>
  )
}

const useListStyles = makeStyles((p) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 56,
    paddingVertical: space.sm,
  },
  pressed: { opacity: 0.7 },
  label: { ...type.body, color: p.text },
  detail: { ...type.caption, color: p.textMuted },
}))

// ── Choosing ────────────────────────────────────────────────────────────────

/**
 * One option in a list. Selection is shown by the indicator's shape as well as
 * its colour, and announced as a radio or a checkbox — never a bare button — so
 * a screen reader says whether picking it clears the others.
 */
export function Choice({
  label, description, selected, onPress, mode,
}: {
  label: string
  description?: string
  selected: boolean
  onPress: () => void
  mode: 'single' | 'multi'
}) {
  const s = useChoiceStyles()
  const { p } = useTheme()
  const join = useJoin()
  return (
    <Pressable
      accessibilityRole={mode === 'single' ? 'radio' : 'checkbox'}
      aria-checked={selected}
      accessibilityLabel={join(label, description)}
      onPress={onPress}
      style={({ pressed }) => [s.choice, selected && s.choiceOn, pressed && s.pressed]}
    >
      <View style={[mode === 'single' ? s.radio : s.box, selected && s.markOn]}>
        {selected ? <Icon name="check" color={p.onPrimary} size={16} /> : null}
      </View>
      <View style={base.grow}>
        <Text style={s.label}>{label}</Text>
        {description ? <Text style={s.description}>{description}</Text> : null}
      </View>
    </Pressable>
  )
}

const useChoiceStyles = makeStyles((p) => ({
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 56,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.md,
    backgroundColor: p.surface,
    // Constant width in both states, so selecting never nudges the list.
    borderWidth: 1.5,
    borderColor: p.lineStrong,
  },
  choiceOn: { borderColor: p.primary, backgroundColor: p.accentSoft },
  pressed: { opacity: 0.8 },
  radio: {
    width: 24, height: 24, borderRadius: radius.pill,
    borderWidth: 1.5, borderColor: p.lineStrong, alignItems: 'center', justifyContent: 'center',
  },
  box: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 1.5, borderColor: p.lineStrong, alignItems: 'center', justifyContent: 'center',
  },
  markOn: { backgroundColor: p.primary, borderColor: p.primary },
  label: { ...type.bodyStrong, color: p.text },
  description: { ...type.caption, color: p.textMuted },
}))

/** Two to four short, mutually exclusive options that fit on one line. */
export function Segmented<T extends string>({
  label, options, value, onChange,
}: {
  /** Names the group for a screen reader; the visible label sits above it. */
  label: string
  options: readonly { value: T; label: string }[]
  value: T | null
  onChange: (value: T) => void
}) {
  const s = useSegmentStyles()
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={s.group}>
      {options.map((option) => {
        const on = option.value === value
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            aria-checked={on}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [s.segment, on && s.segmentOn, pressed && s.pressed]}
          >
            <Text style={[s.text, on && s.textOn]} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const useSegmentStyles = makeStyles((p) => ({
  group: {
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: p.lineStrong,
    backgroundColor: p.surface,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    minHeight: touch.min - 6,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
  segmentOn: { backgroundColor: p.primary },
  pressed: { opacity: 0.8 },
  text: { ...type.bodyStrong, color: p.text },
  textOn: { color: p.onPrimary },
}))

// ── Numbers in ──────────────────────────────────────────────────────────────

function formatStep(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

/**
 * ± around a number. Holding a button repeats it — nudging a weight by a few
 * kilos at 0.1 a tap is otherwise thirty taps.
 *
 * The ± are real, labelled buttons rather than a native "adjustable" control:
 * that role has no web equivalent, and hiding the buttons from assistive tech
 * with native-only props left two nameless, focusable controls on the web.
 */
export function Stepper({
  label, value, onChange, min, max, step = 1, unit,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  unit?: string
}) {
  const s = useStepperStyles()
  const { p } = useTheme()
  const { t } = useT()
  const current = useRef(value)
  current.current = value
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n * 10) / 10))
  const stop = () => {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
  }
  const hold = (dir: 1 | -1) => {
    stop()
    timer.current = setInterval(() => {
      current.current = clamp(current.current + dir * step)
      onChange(current.current)
      // At the limit the held button turns disabled, and a disabled Pressable
      // may never report the release — so the repeat stops itself.
      if (current.current === (dir === 1 ? max : min)) stop()
    }, 80)
  }
  useEffect(() => stop, [])

  const side = (dir: 1 | -1) => {
    const atLimit = dir === 1 ? value >= max : value <= min
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(dir === 1 ? 'common.increase' : 'common.decrease', { label })}
        aria-disabled={atLimit}
        disabled={atLimit}
        onPress={() => {
          stop()
          onChange(clamp(value + dir * step))
        }}
        onLongPress={() => hold(dir)}
        onPressOut={stop}
        style={({ pressed }) => [s.side, pressed && s.pressed, atLimit && s.inert]}
      >
        <Icon name={dir === 1 ? 'plus' : 'minus'} color={p.accent} />
      </Pressable>
    )
  }

  return (
    <View style={s.stepper}>
      {side(-1)}
      {/* Announced when it changes, so the person pressing ± hears the result. */}
      <View style={s.value} accessible aria-live="polite" accessibilityLabel={`${label}: ${formatStep(value)}${unit ? ` ${unit}` : ''}`}>
        <Text style={s.number}>{formatStep(value)}</Text>
        {unit ? <Text style={s.unit}>{unit}</Text> : null}
      </View>
      {side(1)}
    </View>
  )
}

const useStepperStyles = makeStyles((p) => ({
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: p.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: p.lineStrong,
  },
  side: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  inert: { opacity: 0.35 },
  value: { flex: 1, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: space.xs },
  number: { ...type.numeral, color: p.text },
  unit: { ...type.caption, color: p.textMuted },
}))

/** 1–5. Labelled at the ends only: the middle needs no explaining. */
export function Scale({
  label, value, onChange, low, high,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  low: string
  high: string
}) {
  const s = useScaleStyles()
  const join = useJoin()
  return (
    <View style={s.wrap}>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={s.row}>
        {[1, 2, 3, 4, 5].map((n) => {
          const on = value === n
          return (
            <Pressable
              key={n}
              accessibilityRole="radio"
              aria-checked={on}
              accessibilityLabel={join(String(n), n === 1 ? low : n === 5 ? high : undefined)}
              onPress={() => onChange(n)}
              style={({ pressed }) => [s.dot, on && s.dotOn, pressed && s.pressed]}
            >
              <Text style={[s.num, on && s.numOn]}>{n}</Text>
            </Pressable>
          )
        })}
      </View>
      {/* Already part of the 1 and 5 labels; read again here they would be heard twice. */}
      <View style={s.ends} aria-hidden>
        <Text style={s.end}>{low}</Text>
        <Text style={s.end}>{high}</Text>
      </View>
    </View>
  )
}

const useScaleStyles = makeStyles((p) => ({
  wrap: { gap: space.xs },
  row: { flexDirection: 'row', gap: space.sm },
  dot: {
    flex: 1,
    height: touch.min,
    borderRadius: radius.md,
    backgroundColor: p.surface,
    borderWidth: 1.5,
    borderColor: p.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotOn: { backgroundColor: p.primary, borderColor: p.primary },
  pressed: { opacity: 0.8 },
  num: { ...type.numeralSmall, color: p.textMuted },
  numOn: { color: p.onPrimary },
  ends: { flexDirection: 'row', justifyContent: 'space-between' },
  end: { ...type.caption, color: p.textMuted },
}))

/**
 * react-native-web draws the browser's own focus outline on a text field. The
 * field below draws its own focused border instead, so the outline goes —
 * removing it without that replacement would break keyboard use.
 */
const noOutline = { outlineStyle: 'none' } as unknown as TextStyle

/**
 * A labelled text field. The label is always visible above it — a placeholder
 * standing in for a label disappears the moment anyone starts typing — and an
 * error sits directly under the field it is about.
 */
export function Field({
  label, hint, error, style, ...input
}: {
  label: string
  hint?: string
  /** Shown only after a failed submit; nagging while someone types is not help. */
  error?: string | null
  style?: StyleProp<ViewStyle>
} & Pick<
  TextInputProps,
  | 'value' | 'onChangeText' | 'placeholder' | 'inputMode' | 'autoComplete' | 'textContentType'
  | 'autoCapitalize' | 'autoCorrect' | 'keyboardType' | 'maxLength' | 'onSubmitEditing'
  | 'returnKeyType' | 'autoFocus'
>) {
  const s = useFieldStyles()
  const { p } = useTheme()
  const [focused, setFocused] = useState(false)
  const id = useId()
  const described = error || hint ? `${id}-note` : undefined
  return (
    <View style={[s.wrap, style]}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        {...input}
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        // The web's equivalent of the hint above, which react-native-web drops.
        {...({ 'aria-describedby': described, 'aria-invalid': !!error } as object)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholderTextColor={p.textMuted}
        style={[s.input, noOutline, focused && s.inputFocused, !!error && s.inputError]}
      />
      {error ? (
        <View style={base.row} aria-live="polite">
          <Icon name="info" color={p.danger} size={18} />
          <Text nativeID={described} style={s.error}>{error}</Text>
        </View>
      ) : hint ? (
        <Text nativeID={described} style={s.hint}>{hint}</Text>
      ) : null}
    </View>
  )
}

const useFieldStyles = makeStyles((p) => ({
  wrap: { gap: space.xs },
  label: { ...type.label, color: p.text },
  input: {
    ...type.body,
    color: p.text,
    backgroundColor: p.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: p.lineStrong,
    paddingHorizontal: space.lg,
    minHeight: 52,
  },
  inputFocused: { borderColor: p.focus },
  inputError: { borderColor: p.danger },
  hint: { ...type.caption, color: p.textMuted },
  error: { ...type.caption, color: p.danger, flex: 1 },
}))

// ── Numbers out ─────────────────────────────────────────────────────────────

export function Stat({
  label, value, unit, size = 'large',
}: {
  label: string
  value: string | number
  unit?: string
  size?: 'large' | 'small'
}) {
  const s = useStatStyles()
  return (
    <View style={s.stat} accessible accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}`}>
      <View style={s.line}>
        <Text style={size === 'large' ? s.value : s.valueSmall}>{value}</Text>
        {unit ? <Text style={s.unit}>{unit}</Text> : null}
      </View>
      <Text style={s.label}>{label}</Text>
    </View>
  )
}

const useStatStyles = makeStyles((p) => ({
  stat: { gap: 2 },
  line: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs },
  value: { ...type.figure, color: p.text },
  valueSmall: { ...type.figureSmall, color: p.text },
  unit: { ...type.caption, color: p.textMuted },
  label: { ...type.caption, color: p.textMuted },
}))

export function Meter({
  value, max, tone = 'primary', label,
}: {
  value: number
  max: number
  tone?: 'primary' | 'warn'
  /** What is being measured, for a screen reader. */
  label: string
}) {
  const s = useMeterStyles()
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct * 100)}
      style={s.track}
    >
      <View style={[s.fill, tone === 'warn' && s.fillWarn, { width: `${pct * 100}%` }]} />
    </View>
  )
}

const useMeterStyles = makeStyles((p) => ({
  track: { height: 8, borderRadius: radius.pill, backgroundColor: p.surfaceRaised, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: p.primary },
  fillWarn: { backgroundColor: p.warn },
}))

/** Segments, not a percentage: a percentage invites arithmetic mid-form. */
export function Progress({ current, total, label }: { current: number; total: number; label: string }) {
  const s = useProgressStyles()
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={current}
      aria-valuetext={label}
      style={s.row}
    >
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[s.seg, i < current && s.segOn]} />
      ))}
    </View>
  )
}

const useProgressStyles = makeStyles((p) => ({
  row: { flexDirection: 'row', gap: space.xs, marginBottom: space.sm },
  seg: { flex: 1, height: 4, borderRadius: radius.pill, backgroundColor: p.line },
  segOn: { backgroundColor: p.primary },
}))

/** A compact single choice among many short options, where a full row each would bury the screen. */
export function Pill({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const s = usePillStyles()
  const { p } = useTheme()
  return (
    <Pressable
      accessibilityRole="radio"
      aria-checked={selected}
      onPress={onPress}
      // 44 drawn, 48 touchable: a row of 48-high pills reads as a wall.
      hitSlop={{ top: 2, bottom: 2 }}
      style={({ pressed }) => [s.pill, selected && s.pillOn, pressed && s.pressed]}
    >
      {selected ? <Icon name="check" color={p.onPrimary} size={16} /> : null}
      <Text style={[s.text, selected && s.textOn]}>{label}</Text>
    </Pressable>
  )
}

const usePillStyles = makeStyles((p) => ({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minHeight: 44,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: p.lineStrong,
    backgroundColor: p.surface,
  },
  pillOn: { backgroundColor: p.primary, borderColor: p.primary },
  pressed: { opacity: 0.8 },
  text: { ...type.body, color: p.text },
  textOn: { ...type.bodyStrong, color: p.onPrimary },
}))
