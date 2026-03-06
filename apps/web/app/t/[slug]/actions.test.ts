import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ResultAsync, err } from 'neverthrow'

// Mock next/headers so getUser() cookie reads work in test context
const mockCookieStore = new Map<string, { value: string }>()
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (name: string) => mockCookieStore.get(name) ?? undefined,
    set: (name: string, value: string) => { mockCookieStore.set(name, { value }) },
    delete: (name: string) => { mockCookieStore.delete(name) },
  }),
}))

// Mock lib/groups — we're testing the action orchestration, not the DB queries
const mockGetTurnoutBySlug = vi.fn()
vi.mock('@/lib/groups', () => ({
  getTurnoutBySlug: (...args: unknown[]) => mockGetTurnoutBySlug(...args),
}))

// Mock lib/engagements — same reasoning
const mockCreateEngagement = vi.fn()
const mockGetDefaultOpportunity = vi.fn()
vi.mock('@/lib/engagements', () => ({
  createEngagement: (...args: unknown[]) => mockCreateEngagement(...args),
  getDefaultOpportunity: (...args: unknown[]) => mockGetDefaultOpportunity(...args),
}))

// Import after mocks are registered
import { rsvpAction } from './actions'
import { prisma } from '@/lib/db'
import { createSession } from '@/lib/auth/sessions'
import { CredentialType } from '@prisma/client'

// Seed helpers — we need a real session in the DB so getUser() can find it
async function seedUserWithSession(): Promise<string> {
  const user = await prisma.user.create({
    data: {
      displayName: 'TestRsvpUser',
      credentials: {
        create: {
          credentialType: CredentialType.PHONE,
          credential: '+12025550199',
        },
      },
    },
  })

  const sessionResult = await createSession(user.id)
  if (sessionResult.isErr()) throw new Error('Failed to create session for test')

  const token = sessionResult.value
  mockCookieStore.set('session_token', { value: token })

  return user.id
}

beforeEach(async () => {
  // FK-safe cleanup — matches the order in other test files, with Engagement
  // prepended. The try/catch on the whole block handles missing DATABASE_URL
  // so that mock-only tests (e.g. the unauthenticated test) still work when
  // running vitest without sst shell.
  try {
    // @ts-ignore — Engagement model exists after migration
    await prisma.engagement.deleteMany()
    await prisma.opportunity.deleteMany()
    await prisma.turnout.deleteMany()
    await prisma.groupOrganizer.deleteMany()
    await prisma.group.deleteMany()
    await prisma.location.deleteMany()
    await prisma.session.deleteMany()
    await prisma.credential.deleteMany()
    await prisma.user.deleteMany()
    await prisma.phoneRateLimit.deleteMany()
  } catch { /* no DB available — mocked tests still run */ }

  mockCookieStore.clear()
  mockGetTurnoutBySlug.mockReset()
  mockCreateEngagement.mockReset()
  mockGetDefaultOpportunity.mockReset()
})

// Fake turnout and opportunity returned by mocks
const fakeTurnout = { id: 'turnout-123', slug: 'test-slug', groupId: 'group-abc' }
const fakeOpportunity = { id: 'opp-456', turnoutId: 'turnout-123' }

describe('rsvpAction', () => {
  it('returns { error: "Not authenticated" } when no session cookie is set', async () => {
    // Don't seed any user — cookie store is empty from beforeEach
    const result = await rsvpAction('any-slug')
    expect(result).toEqual({ error: 'Not authenticated' })
  })

  it('returns { error: "Turnout not found" } for unknown slug', async () => {
    await seedUserWithSession()
    mockGetTurnoutBySlug.mockResolvedValue(null)

    const result = await rsvpAction('ghost-slug')
    expect(result).toEqual({ error: 'Turnout not found' })
  })

  it('returns { success: true } on valid call with active session', async () => {
    await seedUserWithSession()
    mockGetTurnoutBySlug.mockResolvedValue(fakeTurnout)
    mockGetDefaultOpportunity.mockResolvedValue(fakeOpportunity)
    // createEngagement returns an ok Result
    mockCreateEngagement.mockReturnValue(
      ResultAsync.fromSafePromise(
        Promise.resolve({ id: 'eng-789', status: 'CONFIRMED' })
      )
    )

    const result = await rsvpAction('test-slug')
    expect(result).toEqual({ success: true })
  })

  it('returns { error: "You\'re already going..." } when createEngagement returns ALREADY_RSVPD', async () => {
    await seedUserWithSession()
    mockGetTurnoutBySlug.mockResolvedValue(fakeTurnout)
    mockGetDefaultOpportunity.mockResolvedValue(fakeOpportunity)
    // Simulate the ALREADY_RSVPD error path
    mockCreateEngagement.mockReturnValue(
      ResultAsync.fromPromise(
        Promise.reject(new Error('duplicate')),
        () => ({ code: 'ALREADY_RSVPD' as const })
      )
    )

    const result = await rsvpAction('test-slug')
    expect(result).toEqual({ error: "You're already going to this one." })
  })

  it('returns generic error when createEngagement returns DB_ERROR', async () => {
    await seedUserWithSession()
    mockGetTurnoutBySlug.mockResolvedValue(fakeTurnout)
    mockGetDefaultOpportunity.mockResolvedValue(fakeOpportunity)
    mockCreateEngagement.mockReturnValue(
      ResultAsync.fromPromise(
        Promise.reject(new Error('connection dropped')),
        () => ({ code: 'DB_ERROR' as const, message: 'connection dropped' })
      )
    )

    const result = await rsvpAction('test-slug')
    expect(result).toEqual({ error: 'Something went wrong. Please try again.' })
  })

  it('returns { error: "No opportunity found" } when getDefaultOpportunity returns null', async () => {
    await seedUserWithSession()
    mockGetTurnoutBySlug.mockResolvedValue(fakeTurnout)
    mockGetDefaultOpportunity.mockResolvedValue(null)

    const result = await rsvpAction('test-slug')
    expect(result).toEqual({ error: 'No opportunity found' })
  })
})
