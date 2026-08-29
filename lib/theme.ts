/** Palette read off the Peak mark: deep green ground, lime, sand. */
export const colors = {
  bg: '#0B140C',
  surface: '#132015',
  surfaceAlt: '#1B2B1D',
  line: '#274129',
  lime: '#B7E01E',
  limeDim: '#7FA015',
  limeSoft: '#1F2E12',
  sand: '#E9CCA6',
  text: '#F1F5EC',
  textMute: '#93A38D',
  textFaint: '#63735F',
  danger: '#E5614A',
  dangerSoft: '#2B1512',
  warn: '#E0A93D',
  ok: '#5BC47F',
} as const

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const

export const radius = { sm: 8, md: 14, lg: 20, pill: 999 } as const

export const type = {
  display: { fontSize: 30, fontWeight: '800' },
  title: { fontSize: 22, fontWeight: '700' },
  heading: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 15, fontWeight: '500' },
  small: { fontSize: 13, fontWeight: '500' },
  micro: { fontSize: 11, fontWeight: '600' },
} as const
