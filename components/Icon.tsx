import Svg, { Circle, Path } from 'react-native-svg'
import { useT } from '../lib/i18n/useT'

/**
 * One family, drawn by hand on a 24-unit box at one stroke weight, so nothing
 * here depends on an icon library or on how a font renders an emoji.
 */
const PATHS = {
  today: 'M4 5h16v15H4zM4 10h16M8 3v4M16 3v4M9 15l2 2 4-4',
  meals: 'M4 12h16a8 8 0 0 1-16 0zM3 20h18M8 3v5M11 3v5M8 8h3',
  plan: 'M5 4h14v16H5zM9 9h7M9 13h7M9 17h4',
  profile: 'M4 20a8 8 0 0 1 16 0',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  chevron: 'M9 5l7 7-7 7',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  clock: 'M12 7v5l3 2',
  swap: 'M7 7h11l-3-3M17 17H6l3 3',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4z',
  barcode: 'M4 6v12M7 6v12M10 6v12M14 6v12M17 6v12M20 6v12',
  lock: 'M6 11h12v9H6zM9 11V8a3 3 0 0 1 6 0v3',
  share: 'M12 4v11M8 8l4-4 4 4M5 13v6h14v-6',
  undo: 'M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
  info: 'M12 11v6M12 7.5v.5',
} as const

export type IconName = keyof typeof PATHS

/** Glyphs that point along the reading direction. They flip in Arabic; a clock or a check does not. */
const DIRECTIONAL: ReadonlySet<IconName> = new Set(['chevron', 'undo'])

/** Glyphs whose shape needs a circle the path alphabet would draw badly. */
const CIRCLES: Partial<Record<IconName, { cx: number; cy: number; r: number }>> = {
  profile: { cx: 12, cy: 8, r: 4 },
  clock: { cx: 12, cy: 12, r: 8 },
  camera: { cx: 12, cy: 13, r: 3 },
  info: { cx: 12, cy: 12, r: 9 },
}

export function Icon({
  name, color, size = 24, label,
}: {
  name: IconName
  color: string
  size?: number
  /**
   * Only for an icon that stands alone and means something. An icon beside its
   * own text label stays out of the accessibility tree, or it is read twice.
   */
  label?: string
}) {
  const { rtl } = useT()
  const flip = rtl && DIRECTIONAL.has(name)
  const circle = CIRCLES[name]
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={flip ? { transform: [{ scaleX: -1 }] } : undefined}
      accessible={label !== undefined}
      accessibilityLabel={label}
      aria-hidden={label === undefined}
    >
      <Path d={PATHS[name]} stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      {circle ? <Circle {...circle} stroke={color} strokeWidth={1.75} /> : null}
    </Svg>
  )
}
