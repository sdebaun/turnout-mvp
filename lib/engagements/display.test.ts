import { describe, it, expect } from 'vitest'
import { formatRsvpCount } from './display'

// Pure unit tests — no DB, no async, no setup.
// These are the acceptance criteria for the softening logic.
describe('formatRsvpCount', () => {
  it('returns "Be the first to RSVP!" for 0', () => {
    expect(formatRsvpCount(0)).toBe('Be the first to RSVP!')
  })

  it('returns "Be the first to RSVP!" for counts below 5', () => {
    expect(formatRsvpCount(1)).toBe('Be the first to RSVP!')
    expect(formatRsvpCount(2)).toBe('Be the first to RSVP!')
    expect(formatRsvpCount(3)).toBe('Be the first to RSVP!')
    expect(formatRsvpCount(4)).toBe('Be the first to RSVP!')
  })

  it('returns exact count for 5', () => {
    expect(formatRsvpCount(5)).toBe('5 people are going')
  })

  it('returns exact count for 9', () => {
    expect(formatRsvpCount(9)).toBe('9 people are going')
  })

  it('returns "Over 5 people are going" for 10 (not "Over 10" — that would be false)', () => {
    expect(formatRsvpCount(10)).toBe('Over 5 people are going')
  })

  it('returns "Over 10 people are going" for 11', () => {
    expect(formatRsvpCount(11)).toBe('Over 10 people are going')
  })

  it('returns "Over 10 people are going" for 15 (not "Over 15" — that would be false)', () => {
    expect(formatRsvpCount(15)).toBe('Over 10 people are going')
  })

  it('returns "Over 15 people are going" for 16', () => {
    expect(formatRsvpCount(16)).toBe('Over 15 people are going')
  })

  it('returns "Over 20 people are going" for 23', () => {
    expect(formatRsvpCount(23)).toBe('Over 20 people are going')
  })

  it('returns "Over 95 people are going" for 100', () => {
    expect(formatRsvpCount(100)).toBe('Over 95 people are going')
  })
})
