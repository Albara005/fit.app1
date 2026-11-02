import { describe, expect, it } from 'vitest'
import { ticks } from '../lib/design/ticks'

describe('chart ticks', () => {
  it('give a flat series a real vertical range', () => {
    // The bug: identical readings produced one tick, a zero-height axis, and
    // NaN for every coordinate in the chart.
    const t = ticks(80, 80)
    expect(t.length).toBeGreaterThanOrEqual(2)
    expect(t[0]!).toBeLessThan(80)
    expect(t[t.length - 1]!).toBeGreaterThan(80)
  })

  it('cover the data with at most five round steps', () => {
    const t = ticks(78.1, 79.6)
    expect(t[0]!).toBeLessThanOrEqual(78.1)
    expect(t[t.length - 1]!).toBeGreaterThanOrEqual(79.6)
    expect(t.length).toBeLessThanOrEqual(5)
    expect(t).toEqual([78, 78.5, 79, 79.5, 80])
  })

  it('stay round numbers despite floating-point steps', () => {
    for (const v of ticks(64.3, 65.1)) expect(Math.round(v * 10) / 10).toBe(v)
  })
})
