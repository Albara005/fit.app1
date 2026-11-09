import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const dir = resolve(__dirname, '../../lib/safety')
const files = readdirSync(dir).filter((f) => f.endsWith('.ts'))

/**
 * Combining marks, format characters and the tatweel are invisible in an
 * editor: one dropped from a regex changes what the allergen matcher strips,
 * and nobody reviewing the diff can see it. In the safety code they are
 * written as \u escapes instead.
 */
const INVISIBLE = /[\p{Mn}\p{Me}\p{Cf}ـ]/u

describe('the safety code carries no invisible characters', () => {
  it('found the files to check', () => {
    expect(files).toContain('text.ts')
  })

  it.each(files)('%s', (file) => {
    const lines = readFileSync(resolve(dir, file), 'utf8').split('\n')
    const hits = lines.flatMap((line, i) => (INVISIBLE.test(line) ? [`${file}:${i + 1}`] : []))
    expect(hits).toEqual([])
  })
})
