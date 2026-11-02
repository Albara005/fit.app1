import { describe, expect, it } from 'vitest'
import { palettes, type Palette, type ThemeName } from '../lib/design/tokens'

/** WCAG 2 relative luminance. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

type Role = keyof Palette

/** Body text and anything read as words. */
const TEXT = 4.5
/** A control's boundary or a focus ring: the thing that says "this is tappable". */
const NON_TEXT = 3

/**
 * Only pairings a component actually draws. A pair that never appears on screen
 * proves nothing, and one that appears but is missing here goes unguarded —
 * when a component starts drawing a new pairing, it is added here first.
 */
const PAIRS: readonly [fg: Role, bg: Role, min: number][] = [
  ['text', 'bg', TEXT],
  ['text', 'surface', TEXT],
  ['text', 'surfaceRaised', TEXT],
  ['text', 'accentSoft', TEXT],
  ['text', 'okSoft', TEXT],
  ['text', 'warnSoft', TEXT],
  ['text', 'dangerSoft', TEXT],

  ['textMuted', 'bg', TEXT],
  ['textMuted', 'surface', TEXT],
  ['textMuted', 'surfaceRaised', TEXT],
  ['textMuted', 'accentSoft', TEXT],

  ['accent', 'bg', TEXT],
  ['accent', 'surface', TEXT],
  ['accent', 'accentSoft', TEXT],

  ['onPrimary', 'primary', TEXT],
  ['onAccentFill', 'accentFill', TEXT],

  ['ok', 'surface', TEXT],
  ['ok', 'okSoft', TEXT],
  ['warn', 'surface', TEXT],
  ['warn', 'warnSoft', TEXT],
  ['danger', 'surface', TEXT],
  ['danger', 'dangerSoft', TEXT],

  ['sand', 'bg', TEXT],
  ['sand', 'surface', TEXT],

  ['lineStrong', 'bg', NON_TEXT],
  ['lineStrong', 'surface', NON_TEXT],
  ['lineStrong', 'surfaceRaised', NON_TEXT],
  ['focus', 'bg', NON_TEXT],
  ['focus', 'surface', NON_TEXT],
  // A filled button has no border; its own fill is the boundary.
  ['primary', 'bg', NON_TEXT],
  ['primary', 'surface', NON_TEXT],
]

const HEX = /^#[0-9A-F]{6}$/i

describe.each(Object.keys(palettes) as ThemeName[])('%s theme', (name) => {
  const p = palettes[name]

  it.each(PAIRS)('%s on %s reaches %s:1', (fg, bg, min) => {
    expect(p[fg]).toMatch(HEX)
    expect(p[bg]).toMatch(HEX)
    expect(ratio(p[fg], p[bg])).toBeGreaterThanOrEqual(min)
  })
})

describe('the two themes describe the same roles', () => {
  it('neither theme has a role the other lacks', () => {
    expect(Object.keys(palettes.light).sort()).toEqual(Object.keys(palettes.dark).sort())
  })
})

describe('the calculator itself', () => {
  // Without these the suite could pass on a broken ratio() that returns 21 for
  // everything. Reference values from the WCAG definition.
  it('black on white is 21:1', () => expect(ratio('#000000', '#FFFFFF')).toBeCloseTo(21, 5))
  it('a colour on itself is 1:1', () => expect(ratio('#B7E01E', '#B7E01E')).toBeCloseTo(1, 5))
  it('is symmetric', () => expect(ratio('#0B140C', '#B7E01E')).toBeCloseTo(ratio('#B7E01E', '#0B140C'), 10))
  it('fails lime on white, which is why light mode never uses it as text', () => {
    expect(ratio('#B7E01E', '#FFFFFF')).toBeLessThan(TEXT)
  })
})
