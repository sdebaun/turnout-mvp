import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from './hello-cron'

describe('hello-cron handler', () => {
  beforeEach(() => {
    // Suppress console.log noise from the handler during tests
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  it('returns 200 with correct response structure', async () => {
    const result = await handler()

    expect(result.statusCode).toBe(200)

    const body = JSON.parse(result.body)
    expect(body).toHaveProperty('message', 'Cron executed successfully')
    expect(body).toHaveProperty('userCount')
    expect(body).toHaveProperty('timestamp')
  })

  it('returns a non-negative user count from the database', async () => {
    const result = await handler()
    const body = JSON.parse(result.body)

    // If we got here, the DB query succeeded. Count should be a non-negative integer.
    expect(typeof body.userCount).toBe('number')
    expect(body.userCount).toBeGreaterThanOrEqual(0)
  })

  it('returns a valid ISO timestamp', async () => {
    const result = await handler()
    const body = JSON.parse(result.body)

    // Verify the timestamp is a parseable ISO date, not garbage
    const parsed = new Date(body.timestamp)
    expect(parsed.getTime()).not.toBeNaN()
  })
})
