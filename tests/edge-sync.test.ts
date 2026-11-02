import { describe, expect, it } from 'vitest'
import { build, readGenerated } from '../scripts/sync-edge-safety.mjs'

describe('edge function safety copy', () => {
  it('is in sync with lib/ — run `npm run sync:edge` if this fails', () => {
    const expected = build()
    const actual = readGenerated()
    expect([...actual.keys()].sort()).toEqual([...expected.keys()].sort())
    for (const [name, contents] of expected) {
      expect(actual.get(name), name).toBe(contents)
    }
  })

  it('gives every relative import an explicit extension for Deno', () => {
    for (const [name, contents] of readGenerated()) {
      const bare = [...contents.matchAll(/from\s+'(\.\.?\/[^']+)'/g)].filter(
        ([, spec]) => !spec.endsWith('.ts'),
      )
      expect(bare.map((m) => m[1]), name).toEqual([])
    }
  })
})
