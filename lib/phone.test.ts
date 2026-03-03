import { describe, it, expect } from 'vitest'
import { normalizePhone } from './phone'

describe('normalizePhone', () => {
  it('passes through a well-formed E.164 number unchanged', () => {
    expect(normalizePhone('+12025550100')).toBe('+12025550100')
  })

  it('prepends + to an all-digit string (browser autocomplete strips leading +)', () => {
    expect(normalizePhone('12025550100')).toBe('+12025550100')
  })

  it('passes through a value with non-digit characters other than leading + (e.g. formatted number)', () => {
    // e.g. "+1 (202) 555-0100" — has spaces/parens so the all-digits test fails → no mutation
    expect(normalizePhone('+1 (202) 555-0100')).toBe('+1 (202) 555-0100')
  })

  it('returns an empty string unchanged', () => {
    expect(normalizePhone('')).toBe('')
  })
})
