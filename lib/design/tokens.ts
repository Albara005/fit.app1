/**
 * The design system's single source of truth. Screens never name a hex value:
 * they ask for a role ("muted text", "control boundary"), and the theme answers.
 *
 * Every pairing a component actually draws is pinned in tests/contrast.test.ts.
 * Change a value here and that test decides whether it still reads.
 */

export type ThemeName = 'dark' | 'light'

export interface Palette {
  bg: string
  surface: string
  surfaceRaised: string

  /** Two text tiers only. A third, fainter tier is how text drops below 4.5:1. */
  text: string
  textMuted: string

  /** Decorative hairline between items. Carries no meaning, so no contrast floor. */
  line: string
  /** A control's own edge (input, chip, stepper). Must reach 3:1 — it is the control. */
  lineStrong: string

  primary: string
  onPrimary: string

  /** The brand lime where it is read as text or an icon stroke. */
  accent: string
  /** The brand lime as a fill. In light mode lime is a fill only: as text on white it is 1.5:1. */
  accentFill: string
  onAccentFill: string
  /** Tinted ground for the coach's line — the one place the screen speaks. */
  accentSoft: string

  focus: string

  ok: string
  okSoft: string
  warn: string
  warnSoft: string
  danger: string
  dangerSoft: string

  /** The sand of the Peak mark. Wordmark and secondary data only. */
  sand: string

  /**
   * Charts use the emphasis form: the line the coach reads in the brand hue,
   * the raw readings as gray context. Both validated with the dataviz skill's
   * checker against each theme's card surface (see design-system MASTER.md).
   */
  dataEmphasis: string
  dataContext: string

  scrim: string
}

export const palettes: Record<ThemeName, Palette> = {
  dark: {
    bg: '#0B140C',
    surface: '#132015',
    surfaceRaised: '#1B2B1D',
    text: '#F1F5EC',
    textMuted: '#93A38D',
    line: '#274129',
    lineStrong: '#5A7F5C',
    primary: '#B7E01E',
    onPrimary: '#0B140C',
    accent: '#B7E01E',
    accentFill: '#B7E01E',
    onAccentFill: '#0B140C',
    accentSoft: '#1F2E12',
    focus: '#B7E01E',
    ok: '#5BC47F',
    okSoft: '#12291A',
    warn: '#E0A93D',
    warnSoft: '#2A2110',
    danger: '#E5614A',
    dangerSoft: '#2B1512',
    sand: '#E9CCA6',
    dataEmphasis: '#B7E01E',
    dataContext: '#5A7F5C',
    scrim: 'rgba(0, 0, 0, 0.6)',
  },
  light: {
    bg: '#F7F9F4',
    surface: '#FFFFFF',
    surfaceRaised: '#EEF2EA',
    text: '#0B140C',
    textMuted: '#4A5A46',
    line: '#DCE4D6',
    lineStrong: '#6E7C69',
    // Lime cannot carry a white label or sit as text on white, so the action
    // colour in light mode is the deep green of the mark instead.
    primary: '#1F4024',
    onPrimary: '#FFFFFF',
    accent: '#4F690D',
    accentFill: '#B7E01E',
    onAccentFill: '#0B140C',
    accentSoft: '#EFF6D8',
    focus: '#1F4024',
    ok: '#1A7343',
    okSoft: '#E3F1E8',
    warn: '#8A5A00',
    warnSoft: '#FAEFD9',
    danger: '#B4301C',
    dangerSoft: '#FBE6E2',
    sand: '#7A5A2E',
    dataEmphasis: '#4F690D',
    dataContext: '#8C9887',
    scrim: 'rgba(11, 20, 12, 0.45)',
  },
}

/**
 * Each family name is one weight file. Never pair these with `fontWeight`: on
 * the web the browser would embolden an already-bold file, and Android may
 * ignore the family altogether.
 */
export const fonts = {
  display: 'NotoKufiArabic_700Bold',
  body: 'NotoSansArabic_400Regular',
  bodyBold: 'NotoSansArabic_700Bold',
} as const

/**
 * Base 16. Arabic carries tall ascenders and stacked marks, so line height runs
 * near 1.6 rather than the 1.4 a Latin-only scale would use; tighter and Kufi
 * clips its own descenders.
 */
// Asserted separately: inside `as const` the array would be readonly, which
// React Native's style types refuse.
const TABULAR = ['tabular-nums'] as Array<'tabular-nums'>

export const type = {
  display: { fontFamily: fonts.display, fontSize: 32, lineHeight: 50 },
  title: { fontFamily: fonts.display, fontSize: 24, lineHeight: 38 },
  heading: { fontFamily: fonts.display, fontSize: 18, lineHeight: 30 },
  /** The coach's one sentence. It is the product, so it outranks body text. */
  lead: { fontFamily: fonts.body, fontSize: 18, lineHeight: 30 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 26 },
  bodyStrong: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 26 },
  label: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 22 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 20 },
  /**
   * A standalone value keeps proportional figures: equal-width digits make a
   * large "121" look loose. Tabular figures are for values that change in place
   * (a stepper going 9 → 10 must not shift its label) or line up in a column.
   */
  figure: { fontFamily: fonts.bodyBold, fontSize: 28, lineHeight: 36 },
  figureSmall: { fontFamily: fonts.bodyBold, fontSize: 18, lineHeight: 26 },
  numeral: { fontFamily: fonts.bodyBold, fontSize: 28, lineHeight: 36, fontVariant: TABULAR },
  numeralSmall: { fontFamily: fonts.bodyBold, fontSize: 18, lineHeight: 26, fontVariant: TABULAR },
} as const

/** A 4-point rhythm. Nothing in a layout is spaced by a value outside it. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const

/** 48 clears both the iOS (44pt) and Android (48dp) minimum with one number. */
export const touch = { min: 48 } as const

export const layout = {
  gutter: 16,
  gutterWide: 24,
  /** Past this width a single column of Arabic text stops being comfortable to read. */
  maxContent: 560,
  wideBreakpoint: 600,
} as const

/** Exit runs at 70% of entry: leaving should never feel slower than arriving. */
export const motion = {
  press: 120,
  state: 200,
  screen: 280,
  exitFactor: 0.7,
} as const
