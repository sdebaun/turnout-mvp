import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Mock lib/groups so we can control what the route sees — no DB needed
const mockGetTurnoutBySlug = vi.fn()
vi.mock('@/lib/groups', () => ({
  getTurnoutBySlug: (...args: unknown[]) => mockGetTurnoutBySlug(...args),
}))

// Import after mock registration
import { GET } from './route'

// A minimal fake turnout that satisfies what the route reads
function makeFakeTurnout(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tur_test123',
    slug: 'test-slug',
    title: 'First Planning Meeting',
    description: 'Stop the gravel mine from destroying Willow Creek',
    startsAt: new Date('2027-06-15T18:00:00Z'),
    endsAt: null,
    group: {
      name: 'Save Willow Creek',
      mission: 'Stop the mine',
    },
    primaryLocation: {
      name: "Joe's Coffee",
      formattedAddress: '123 Main St, Ventura, CA',
      lat: 34.2805,
      lng: -119.2945,
    },
    ...overrides,
  }
}

function makeRequest(slug: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/turnout/${slug}/ics`)
}

beforeEach(() => {
  mockGetTurnoutBySlug.mockReset()
})

describe('GET /api/turnout/[slug]/ics', () => {
  it('returns 404 for unknown slug', async () => {
    mockGetTurnoutBySlug.mockResolvedValue(null)

    const response = await GET(makeRequest('ghost'), { params: { slug: 'ghost' } })
    expect(response.status).toBe(404)
  })

  it('returns 200 with Content-Type: text/calendar for known slug', async () => {
    mockGetTurnoutBySlug.mockResolvedValue(makeFakeTurnout())

    const response = await GET(makeRequest('test-slug'), { params: { slug: 'test-slug' } })
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('text/calendar')
  })

  it('includes Content-Disposition attachment header', async () => {
    mockGetTurnoutBySlug.mockResolvedValue(makeFakeTurnout())

    const response = await GET(makeRequest('test-slug'), { params: { slug: 'test-slug' } })
    const disposition = response.headers.get('Content-Disposition')
    expect(disposition).toContain('attachment')
    expect(disposition).toContain('test-slug.ics')
  })

  it('response body includes DTSTART, DTEND, SUMMARY matching turnout data', async () => {
    mockGetTurnoutBySlug.mockResolvedValue(makeFakeTurnout())

    const response = await GET(makeRequest('test-slug'), { params: { slug: 'test-slug' } })
    const body = await response.text()

    // DTSTART must be the startsAt in UTC ISO format
    expect(body).toContain('DTSTART:20270615T180000Z')
    // SUMMARY must contain the turnout title
    expect(body).toContain('SUMMARY:First Planning Meeting')
  })

  it('DTEND is startsAt + 2h when endsAt is null', async () => {
    mockGetTurnoutBySlug.mockResolvedValue(makeFakeTurnout({ endsAt: null }))

    const response = await GET(makeRequest('test-slug'), { params: { slug: 'test-slug' } })
    const body = await response.text()

    // startsAt is 2027-06-15T18:00:00Z, so +2h = 2027-06-15T20:00:00Z
    expect(body).toContain('DTEND:20270615T200000Z')
  })

  it('DTEND uses turnout.endsAt when set', async () => {
    const endsAt = new Date('2027-06-15T22:00:00Z')
    mockGetTurnoutBySlug.mockResolvedValue(makeFakeTurnout({ endsAt }))

    const response = await GET(makeRequest('test-slug'), { params: { slug: 'test-slug' } })
    const body = await response.text()

    expect(body).toContain('DTEND:20270615T220000Z')
  })

  it('body includes VALARM with -PT1H trigger', async () => {
    mockGetTurnoutBySlug.mockResolvedValue(makeFakeTurnout())

    const response = await GET(makeRequest('test-slug'), { params: { slug: 'test-slug' } })
    const body = await response.text()

    expect(body).toContain('BEGIN:VALARM')
    expect(body).toContain('TRIGGER:-PT1H')
    expect(body).toContain('ACTION:DISPLAY')
    expect(body).toContain('END:VALARM')
  })

  it('escapes comma in title', async () => {
    mockGetTurnoutBySlug.mockResolvedValue(makeFakeTurnout({ title: 'March, Rally, Now' }))

    const response = await GET(makeRequest('test-slug'), { params: { slug: 'test-slug' } })
    const body = await response.text()

    // Commas in ICS text properties must be backslash-escaped
    expect(body).toContain('SUMMARY:March\\, Rally\\, Now')
  })

  it('escapes semicolon in title', async () => {
    mockGetTurnoutBySlug.mockResolvedValue(makeFakeTurnout({ title: 'Stand Up; Show Up' }))

    const response = await GET(makeRequest('test-slug'), { params: { slug: 'test-slug' } })
    const body = await response.text()

    expect(body).toContain('SUMMARY:Stand Up\\; Show Up')
  })

  it('escapes backslash in title', async () => {
    mockGetTurnoutBySlug.mockResolvedValue(makeFakeTurnout({ title: 'This\\That' }))

    const response = await GET(makeRequest('test-slug'), { params: { slug: 'test-slug' } })
    const body = await response.text()

    expect(body).toContain('SUMMARY:This\\\\That')
  })

  it('body includes BEGIN:VCALENDAR and END:VCALENDAR', async () => {
    mockGetTurnoutBySlug.mockResolvedValue(makeFakeTurnout())

    const response = await GET(makeRequest('test-slug'), { params: { slug: 'test-slug' } })
    const body = await response.text()

    expect(body).toContain('BEGIN:VCALENDAR')
    expect(body).toContain('END:VCALENDAR')
    expect(body).toContain('VERSION:2.0')
  })

  it('body includes the turnout URL with /t/[slug] path', async () => {
    mockGetTurnoutBySlug.mockResolvedValue(makeFakeTurnout())

    const response = await GET(makeRequest('test-slug'), { params: { slug: 'test-slug' } })
    const body = await response.text()

    // The host header format can vary in test environments — check for the
    // slug path rather than a hardcoded host to keep this test environment-agnostic
    expect(body).toMatch(/URL:https?:\/\/.+\/t\/test-slug/)
  })

  it('falls back to group mission when turnout has no description', async () => {
    mockGetTurnoutBySlug.mockResolvedValue(makeFakeTurnout({ description: null }))

    const response = await GET(makeRequest('test-slug'), { params: { slug: 'test-slug' } })
    const body = await response.text()

    expect(body).toContain('DESCRIPTION:Stop the mine')
  })
})
