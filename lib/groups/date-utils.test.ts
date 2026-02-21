import { describe, it, expect } from 'vitest'
import { toUTCDate } from './date-utils'

describe('toUTCDate', () => {
  it('converts EDT (UTC-4) correctly — March 15 is after spring forward', () => {
    const result = toUTCDate('2025-03-15', '18:00', 'America/New_York')
    expect(result).toEqual(new Date('2025-03-15T22:00:00Z'))
  })

  it('converts EST (UTC-5) correctly — March 1 is before spring forward', () => {
    const result = toUTCDate('2025-03-01', '18:00', 'America/New_York')
    expect(result).toEqual(new Date('2025-03-01T23:00:00Z'))
  })

  it('converts PDT (UTC-7) correctly — July 4 is summer time in LA', () => {
    const result = toUTCDate('2025-07-04', '14:00', 'America/Los_Angeles')
    expect(result).toEqual(new Date('2025-07-04T21:00:00Z'))
  })
})
