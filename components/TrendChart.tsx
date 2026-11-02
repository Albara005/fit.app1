import { useState } from 'react'
import { type GestureResponderEvent, Text, View } from 'react-native'
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg'
import { makeStyles, useTheme } from '../lib/design/theme'
import { space } from '../lib/design/tokens'
import { type } from '../lib/design/typography'
import { ltr } from '../lib/i18n'
import { useT } from '../lib/i18n/useT'
import type { WeightEntry } from '../lib/data/repo'
import type { TrendLine } from '../lib/types'
import { Button, Caption, Divider, Row } from './ui'

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

/** Round, readable ticks: 0.2, 0.5, 1, 2 or 5 kg apart, at most five of them. */
function ticks(lo: number, hi: number): number[] {
  const span = Math.max(hi - lo, 0.4)
  const step = [0.2, 0.5, 1, 2, 5].find((s) => span / s <= 4) ?? 10
  const start = Math.floor(lo / step) * step
  const end = Math.ceil(hi / step) * step
  const out: number[] = []
  for (let v = start; v <= end + 1e-9; v += step) out.push(Math.round(v * 10) / 10)
  return out
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

  if (!line || readings.length < 2) return null

  const n = readings.length
  const values = readings.map((r) => r.weightKg)
  const yTicks = ticks(Math.min(...values, line.from.kg, line.to.kg), Math.max(...values, line.from.kg, line.to.kg))
  const yMin = yTicks[0]!
  const yMax = yTicks[yTicks.length - 1]!

  const plotW = Math.max(0, width - GUTTER - PAD * 2)
  // Laid out left-to-right, then mirrored as a whole in Arabic.
  const xLtr = (at: number) => GUTTER + PAD + (n === 1 ? plotW / 2 : (at / (n - 1)) * plotW)
  const x = (at: number) => (rtl ? width - xLtr(at) : xLtr(at))
  const y = (v: number) => PAD + (1 - (v - yMin) / (yMax - yMin)) * (PLOT_H - PAD * 2)
  // Centred in the gutter. SVG's start/end anchors follow the text direction —
  // under dir="rtl" a start-anchored label grew into the plot — and native SVG
  // does not inherit that direction at all. Middle means the same everywhere.
  const tickX = rtl ? width - GUTTER / 2 : GUTTER / 2

  const shown = active ?? n - 1
  const reading = readings[shown]!

  const pick = (e: GestureResponderEvent) => {
    if (plotW <= 0) return
    const px = rtl ? width - e.nativeEvent.locationX : e.nativeEvent.locationX
    const i = Math.round(((px - GUTTER - PAD) / plotW) * (n - 1))
    setActive(Math.min(n - 1, Math.max(0, i)))
  }

  const first = kg(values[0]!)
  const last = kg(values[n - 1]!)

  return (
    <View style={s.wrap}>
      <Text accessibilityRole="header" style={s.title}>
        {t('chart.title')}
      </Text>

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
            {/* Recessive: hairline, solid, one step off the surface. */}
            {yTicks.map((v) => (
              <Line key={`g${v}`} x1={x(0) - (rtl ? -PAD : PAD)} x2={x(n - 1) + (rtl ? -PAD : PAD)} y1={y(v)} y2={y(v)} stroke={p.line} strokeWidth={1} />
            ))}
            {yTicks.map((v) => (
              <SvgText
                key={`t${v}`}
                x={tickX}
                y={y(v) + 4}
                fontSize={11}
                fontFamily={type.caption.fontFamily}
                fill={p.textMuted}
                textAnchor="middle"
              >
                {kg(v)}
              </SvgText>
            ))}

            {active !== null ? (
              <Line x1={x(active)} x2={x(active)} y1={PAD / 2} y2={PLOT_H - PAD / 2} stroke={p.lineStrong} strokeWidth={1} />
            ) : null}

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
            {active !== null ? (
              <Circle cx={x(active)} cy={y(values[active]!)} r={5} fill={p.text} stroke={p.surface} strokeWidth={2} />
            ) : null}

            {/* Dates at the two ends only; the table has the rest. */}
            <SvgText x={x(0)} y={PLOT_H + 14} fontSize={11} fontFamily={type.caption.fontFamily} fill={p.textMuted} textAnchor="middle">
              {shortDate(readings[0]!.day)}
            </SvgText>
            <SvgText x={x(n - 1)} y={PLOT_H + 14} fontSize={11} fontFamily={type.caption.fontFamily} fill={p.textMuted} textAnchor="middle">
              {shortDate(readings[n - 1]!.day)}
            </SvgText>
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
          {readings.map((r, i) => (
            <View key={r.day}>
              {i > 0 ? <Divider /> : null}
              <Row style={s.tableRow}>
                <Text style={[s.cell, s.grow]}>{shortDate(r.day)}</Text>
                <Text style={s.cell}>
                  {kg(r.weightKg)} {t('common.kg')}
                </Text>
              </Row>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}

const useStyles = makeStyles((p) => ({
  wrap: { gap: space.sm },
  title: { ...type.heading, color: p.text },
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
