import { useMemo, useState } from 'react'
import { type GestureResponderEvent, Text, View } from 'react-native'
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg'
import { makeStyles, useTheme } from '../lib/design/theme'
import { space } from '../lib/design/tokens'
import { type } from '../lib/design/typography'
import { ltr } from '../lib/i18n'
import { useT } from '../lib/i18n/useT'
import { ticks } from '../lib/design/ticks'
import type { WeightEntry } from '../lib/data/repo'
import type { TrendLine } from '../lib/types'
import { Button, Caption, Divider, Heading, Row } from './ui'

/** The plot and the date band beneath it are one height, so the axis is never cut off. */
const PLOT_H = 132
const AXIS_H = 22
const GUTTER = 40 // tick labels, on the start side
const PAD = 10

const kg = (v: number) => v.toFixed(1)
/** Day and month from the ISO date itself — no Date object, so no timezone can shift it. */
const shortDate = (iso: string) => {
  const [, m, d] = iso.split('-')
  return `${Number(d)}/${Number(m)}`
}

/**
 * Weigh-ins as gray context, and in the brand hue the line the coach actually
 * decided from — passed in, never fitted here, so the picture cannot disagree
 * with the decision. Time runs with the reading direction: right to left in
 * Arabic, like every other progress mark in the app.
 *
 * Pressing or dragging moves a crosshair that snaps to the nearest reading; the
 * readout above always shows a value (the latest, until one is chosen), and the
 * table view carries every value, so nothing is reachable only by hovering.
 */
export function TrendChart({ readings, line }: { readings: readonly WeightEntry[]; line: TrendLine | null }) {
  const { t, rtl } = useT()
  const { p } = useTheme()
  const s = useStyles()
  const [width, setWidth] = useState(0)
  const [active, setActive] = useState<number | null>(null)
  const [table, setTable] = useState(false)

  const n = readings.length
  const plotW = Math.max(0, width - GUTTER - PAD * 2)
  // Laid out left to right, then mirrored as a whole in Arabic. Mirroring is
  // its own inverse, so the same function maps a touch back into the layout.
  const mirror = (ltrX: number) => (rtl ? width - ltrX : ltrX)
  const x = (at: number) => mirror(GUTTER + PAD + (at / (n - 1)) * plotW)
  const values = readings.map((r) => r.weightKg)
  const yTicks = line ? ticks(Math.min(...values, line.from.kg, line.to.kg), Math.max(...values, line.from.kg, line.to.kg)) : []
  const yMin = yTicks[0] ?? 0
  const yMax = yTicks[yTicks.length - 1] ?? 1
  const y = (v: number) => PAD + (1 - (v - yMin) / (yMax - yMin)) * (PLOT_H - PAD * 2)

  // Everything but the crosshair. A drag re-renders at pointer rate, and only
  // the crosshair moves.
  const still = useMemo(() => {
    if (!line || n < 2 || width === 0) return null
    const label = { fontSize: 11, fontFamily: type.caption.fontFamily, fill: p.textMuted, textAnchor: 'middle' as const }
    return (
      <>
        {/* Recessive: hairline, solid, one step off the surface. */}
        {yTicks.map((v) => (
          <Line key={`g${v}`} x1={mirror(GUTTER)} x2={mirror(width)} y1={y(v)} y2={y(v)} stroke={p.line} strokeWidth={1} />
        ))}
        {/* Centred in the gutter. SVG's start/end anchors follow the text
            direction — under dir="rtl" a start-anchored label grew into the
            plot — and native SVG does not inherit that direction at all.
            Middle means the same everywhere. */}
        {yTicks.map((v) => (
          <SvgText key={`t${v}`} x={mirror(GUTTER / 2)} y={y(v) + 4} {...label}>
            {kg(v)}
          </SvgText>
        ))}
        {/* Context first, so the line the coach reads is drawn over it. A
            surface-coloured ring keeps each dot readable where it meets the line. */}
        {values.map((v, i) => (
          <Circle key={`p${i}`} cx={x(i)} cy={y(v)} r={4} fill={p.dataContext} stroke={p.surface} strokeWidth={2} />
        ))}
        <Line
          x1={x(line.from.at)}
          y1={y(line.from.kg)}
          x2={x(line.to.at)}
          y2={y(line.to.kg)}
          stroke={p.dataEmphasis}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Circle cx={x(line.to.at)} cy={y(line.to.kg)} r={4} fill={p.dataEmphasis} stroke={p.surface} strokeWidth={2} />
        {/* Dates at the two ends only; the table has the rest. */}
        <SvgText x={x(0)} y={PLOT_H + 14} {...label}>
          {shortDate(readings[0]!.day)}
        </SvgText>
        <SvgText x={x(n - 1)} y={PLOT_H + 14} {...label}>
          {shortDate(readings[n - 1]!.day)}
        </SvgText>
      </>
    )
    // x, y and mirror are derived from exactly these.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readings, line, width, rtl, p])

  const rows = useMemo(
    () =>
      readings.map((r, i) => (
        <View key={r.day}>
          {i > 0 ? <Divider /> : null}
          <Row style={s.tableRow}>
            <Text style={[s.cell, s.grow]}>{shortDate(r.day)}</Text>
            <Text style={s.cell}>
              {kg(r.weightKg)} {t('common.kg')}
            </Text>
          </Row>
        </View>
      )),
    [readings, s, t],
  )

  if (!line || n < 2) return null

  const shown = active ?? n - 1
  const reading = readings[shown]!

  const pick = (e: GestureResponderEvent) => {
    if (plotW <= 0) return
    const i = Math.round(((mirror(e.nativeEvent.locationX) - GUTTER - PAD) / plotW) * (n - 1))
    setActive(Math.min(n - 1, Math.max(0, i)))
  }

  const first = kg(values[0]!)
  const last = kg(values[n - 1]!)

  return (
    <View style={s.wrap}>
      <Heading>{t('chart.title')}</Heading>

      {/* Two layers, so a legend — each key drawn like its mark. */}
      <Row style={s.legend}>
        <Row style={s.key}>
          <View style={[s.dotKey, { backgroundColor: p.dataContext }]} />
          <Caption>{t('chart.weighIns')}</Caption>
        </Row>
        <Row style={s.key}>
          <View style={[s.lineKey, { backgroundColor: p.dataEmphasis }]} />
          <Caption>{t('chart.trend')}</Caption>
        </Row>
      </Row>

      {/* Value first, date second: here the reader has the series and wants the number. */}
      <Text style={s.readout} aria-live="polite">
        <Text style={s.readoutValue}>{ltr(kg(reading.weightKg))}</Text>
        {` ${t('common.kg')} · ${shortDate(reading.day)}`}
      </Text>

      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`${t('chart.title')}: ${t('chart.summary', { first, last })}`}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={pick}
        onResponderMove={pick}
        style={{ height: PLOT_H + AXIS_H }}
      >
        {width > 0 ? (
          <Svg width={width} height={PLOT_H + AXIS_H}>
            {active !== null ? (
              <Line x1={x(active)} x2={x(active)} y1={PAD / 2} y2={PLOT_H - PAD / 2} stroke={p.lineStrong} strokeWidth={1} />
            ) : null}
            {still}
            {active !== null ? (
              <Circle cx={x(active)} cy={y(values[active]!)} r={5} fill={p.text} stroke={p.surface} strokeWidth={2} />
            ) : null}
          </Svg>
        ) : null}
      </View>

      <Caption>{t('chart.why')}</Caption>

      <Button label={t(table ? 'chart.hideTable' : 'chart.showTable')} variant="quiet" onPress={() => setTable(!table)} />
      {table ? (
        <View>
          <Row style={s.tableRow}>
            <Caption strong style={s.grow}>
              {t('chart.date')}
            </Caption>
            <Caption strong>{t('onboarding.weight')}</Caption>
          </Row>
          {rows}
        </View>
      ) : null}
    </View>
  )
}

const useStyles = makeStyles((p) => ({
  wrap: { gap: space.sm },
  legend: { gap: space.lg },
  key: { gap: space.xs },
  dotKey: { width: 8, height: 8, borderRadius: 4 },
  lineKey: { width: 16, height: 2, borderRadius: 1 },
  readout: { ...type.body, color: p.textMuted },
  readoutValue: { ...type.bodyStrong, color: p.text },
  tableRow: { paddingVertical: space.xs },
  grow: { flex: 1 },
  // A column of numbers that should line up: the one place tabular figures belong here.
  cell: { ...type.body, color: p.text, fontVariant: ['tabular-nums'] },
}))
