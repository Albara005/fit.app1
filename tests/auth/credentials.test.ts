import { describe, expect, it } from 'vitest'
import { isCodeShaped, isEmailShaped } from '../../lib/auth/credentials'

describe('email validation', () => {
  it.each([
    ['albara@example.com', true],
    ['a.b+tag@sub.example.co', true],
    ['user@example.om', true],
    ['no-at-sign.com', false],
    ['two@@example.com', false],
    ['trailing@example', false],
    ['spaced address@example.com', false],
    ['', false],
  ])('%s', (email, expected) => {
    expect(isEmailShaped(email)).toBe(expected)
  })

  it('tolerates the whitespace a paste brings with it', () => {
    expect(isEmailShaped('  albara@example.com  ')).toBe(true)
  })
})

describe('code validation', () => {
  it.each([
    ['123456', true],
    ['000000', true],
    ['12345', false],
    ['1234567', false],
    ['12345a', false],
    ['', false],
  ])('%s', (code, expected) => {
    expect(isCodeShaped(code)).toBe(expected)
  })

  it('accepts a code pasted with surrounding spaces', () => {
    expect(isCodeShaped(' 123456 ')).toBe(true)
  })

  it('rejects Eastern Arabic digits, which the mail never contains', () => {
    // A keyboard set to Arabic numerals would otherwise produce a code that
    // looks right to the user and fails silently at the server.
    expect(isCodeShaped('١٢٣٤٥٦')).toBe(false)
  })
})
