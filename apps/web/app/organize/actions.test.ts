import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prisma } from '@/lib/db'
import { CredentialType } from '@prisma/client'
import { createSession, setSessionCookie } from '@/lib/auth/sessions'

// Mock twilio — auth library uses it under the hood
const mockVerificationsCreate = vi.fn()
const mockVerificationChecksCreate = vi.fn()

vi.mock('twilio', () => ({
  default: () => ({
    verify: {
      v2: {
        services: () => ({
          verifications: { create: mockVerificationsCreate },
          verificationChecks: { create: mockVerificationChecksCreate },
        }),
      },
    },
  }),
}))

// Mock next/headers for session cookie operations
const mockCookieStore = new Map<string, { value: string }>()
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (name: string) => mockCookieStore.get(name) ?? undefined,
    set: (name: string, value: string, _opts?: unknown) => {
      mockCookieStore.set(name, { value })
    },
    delete: (name: string) => {
      mockCookieStore.delete(name)
    },
  }),
}))

// Mock the groups library so we're testing orchestration, not business logic
const mockCreateGroupWithTurnout = vi.fn()
const mockToUTCDate = vi.fn()

vi.mock('@/lib/groups', () => ({
  createGroupWithTurnout: (...args: unknown[]) => mockCreateGroupWithTurnout(...args),
  toUTCDate: (...args: unknown[]) => mockToUTCDate(...args),
}))

// Mock logger to verify error logging
const mockLoggerError = vi.fn()
vi.mock('@/lib/logger', () => ({
  logger: {
    error: (...args: unknown[]) => mockLoggerError(...args),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

// Import after mocks
import { createGroupWithTurnoutAction } from './actions'

// Valid input fixture
function validInput() {
  return {
    groupName: 'Save Willow Creek',
    mission: 'Stop the gravel mine from destroying Willow Creek',
    turnoutTitle: 'First Planning Meeting',
    description: 'Planning session for the campaign',
    location: {
      name: "Joe's Coffee",
      formattedAddress: '123 Main St, Springfield, OR',
      lat: 44.0462,
      lng: -123.0222,
      placeId: 'ChIJ_test123',
    },
    turnoutDate: '2027-06-15',
    turnoutTime: '18:00',
    turnoutTimezone: 'America/Los_Angeles',
  }
}

async function seedUserWithSession(): Promise<string> {
  const user = await prisma.user.create({
    data: {
      displayName: 'TestOrganizer',
      credentials: {
        create: {
          credentialType: CredentialType.PHONE,
          credential: '+12025550199',
        },
      },
    },
  })

  const sessionResult = await createSession(user.id)
  if (sessionResult.isErr()) throw new Error('Failed to create session')

  const token = sessionResult.value
  setSessionCookie(token)
  // Also put token into mock cookie store so getUser() can find it
  mockCookieStore.set('session_token', { value: token })

  return user.id
}

beforeEach(async () => {
  // Clean up in FK order
  await prisma.opportunity.deleteMany()
  await prisma.turnout.deleteMany()
  await prisma.groupOrganizer.deleteMany()
  await prisma.group.deleteMany()
  await prisma.location.deleteMany()
  await prisma.session.deleteMany()
  await prisma.credential.deleteMany()
  await prisma.user.deleteMany()
  await prisma.phoneRateLimit.deleteMany()

  mockCookieStore.clear()
  mockCreateGroupWithTurnout.mockReset()
  mockToUTCDate.mockReset()
  mockLoggerError.mockReset()

  // Default: toUTCDate returns a future date
  mockToUTCDate.mockReturnValue(new Date('2027-06-15T01:00:00Z'))
})

describe('createGroupWithTurnoutAction', () => {
  it('returns error when no session (unauthenticated)', async () => {
    const result = await createGroupWithTurnoutAction(validInput())
    expect(result).toEqual({ error: 'Not authenticated' })
  })

  it('returns error when groupName is missing', async () => {
    await seedUserWithSession()
    const input = { ...validInput(), groupName: '' }
    const result = await createGroupWithTurnoutAction(input)
    expect(result).toEqual({ error: 'Group name is required' })
  })

  it('returns error when mission is missing', async () => {
    await seedUserWithSession()
    const input = { ...validInput(), mission: '   ' }
    const result = await createGroupWithTurnoutAction(input)
    expect(result).toEqual({ error: 'Mission is required' })
  })

  it('returns error when turnoutTitle is missing', async () => {
    await seedUserWithSession()
    const input = { ...validInput(), turnoutTitle: '' }
    const result = await createGroupWithTurnoutAction(input)
    expect(result).toEqual({ error: 'Turnout title is required' })
  })

  it('returns error when location.name is missing', async () => {
    await seedUserWithSession()
    const input = { ...validInput(), location: { name: '' } }
    const result = await createGroupWithTurnoutAction(input)
    expect(result).toEqual({ error: 'Location name is required' })
  })

  it('returns error when turnoutDate is missing', async () => {
    await seedUserWithSession()
    const input = { ...validInput(), turnoutDate: '' }
    const result = await createGroupWithTurnoutAction(input)
    expect(result).toEqual({ error: 'Turnout date is required' })
  })

  it('returns error when turnoutTime is missing', async () => {
    await seedUserWithSession()
    const input = { ...validInput(), turnoutTime: '' }
    const result = await createGroupWithTurnoutAction(input)
    expect(result).toEqual({ error: 'Turnout time is required' })
  })

  it('returns error when turnoutTimezone is missing', async () => {
    await seedUserWithSession()
    const input = { ...validInput(), turnoutTimezone: '' }
    const result = await createGroupWithTurnoutAction(input)
    expect(result).toEqual({ error: 'Turnout timezone is required' })
  })

  it('returns error when group name exceeds 100 chars', async () => {
    await seedUserWithSession()
    const input = { ...validInput(), groupName: 'x'.repeat(101) }
    const result = await createGroupWithTurnoutAction(input)
    expect(result).toEqual({ error: 'Group name must be 100 characters or less' })
  })

  it('returns error when mission exceeds 500 chars', async () => {
    await seedUserWithSession()
    const input = { ...validInput(), mission: 'x'.repeat(501) }
    const result = await createGroupWithTurnoutAction(input)
    expect(result).toEqual({ error: 'Mission must be 500 characters or less' })
  })

  it('returns error when description exceeds 1000 chars', async () => {
    await seedUserWithSession()
    const input = { ...validInput(), description: 'x'.repeat(1001) }
    const result = await createGroupWithTurnoutAction(input)
    expect(result).toEqual({ error: 'Description must be 1000 characters or less' })
  })

  it('returns error when turnoutDate is in the past', async () => {
    await seedUserWithSession()
    // Make toUTCDate return a past date
    mockToUTCDate.mockReturnValue(new Date('2020-01-01T00:00:00Z'))

    const input = validInput()
    const result = await createGroupWithTurnoutAction(input)
    expect(result).toEqual({ error: 'Turnout date must be in the future' })
  })

  it('returns success with turnoutSlug on valid input with active session', async () => {
    await seedUserWithSession()

    // Mock successful creation
    const { ok } = await import('neverthrow')
    mockCreateGroupWithTurnout.mockReturnValue(
      Promise.resolve(ok({ groupId: 'grp_1', turnoutId: 'trn_1', turnoutSlug: 'abc12345' }))
        .then(v => ({ ...v, isOk: () => true, isErr: () => false }))
    )

    // Use neverthrow's ResultAsync pattern
    const { ResultAsync } = await import('neverthrow')
    mockCreateGroupWithTurnout.mockReturnValue(
      ResultAsync.fromSafePromise(
        Promise.resolve({ groupId: 'grp_1', turnoutId: 'trn_1', turnoutSlug: 'abc12345' })
      )
    )

    const result = await createGroupWithTurnoutAction(validInput())
    expect(result).toEqual({ success: true, turnoutSlug: 'abc12345' })
  })

  it('passes location as nested object to createGroupWithTurnout', async () => {
    await seedUserWithSession()

    const { ResultAsync } = await import('neverthrow')
    mockCreateGroupWithTurnout.mockReturnValue(
      ResultAsync.fromSafePromise(
        Promise.resolve({ groupId: 'grp_1', turnoutId: 'trn_1', turnoutSlug: 'abc12345' })
      )
    )

    const input = validInput()
    await createGroupWithTurnoutAction(input)

    expect(mockCreateGroupWithTurnout).toHaveBeenCalledWith(
      expect.any(String), // userId
      expect.objectContaining({
        location: {
          name: "Joe's Coffee",
          formattedAddress: '123 Main St, Springfield, OR',
          lat: 44.0462,
          lng: -123.0222,
          placeId: 'ChIJ_test123',
        },
      })
    )
  })

  it('returns error (not throws) when createGroupWithTurnout returns err', async () => {
    await seedUserWithSession()

    const { ResultAsync, err } = await import('neverthrow')
    mockCreateGroupWithTurnout.mockReturnValue(
      ResultAsync.fromPromise(
        Promise.reject(new Error('DB exploded')),
        () => 'DB exploded'
      )
    )

    const result = await createGroupWithTurnoutAction(validInput())
    expect(result).toHaveProperty('error')
    expect((result as { error: string }).error).toContain('DB exploded')
  })

  it('calls logger.error when createGroupWithTurnout returns err', async () => {
    await seedUserWithSession()

    const { ResultAsync } = await import('neverthrow')
    mockCreateGroupWithTurnout.mockReturnValue(
      ResultAsync.fromPromise(
        Promise.reject(new Error('Slug collision nightmare')),
        () => 'Slug collision nightmare'
      )
    )

    await createGroupWithTurnoutAction(validInput())

    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.objectContaining({
        groupName: 'Save Willow Creek',
        error: 'Slug collision nightmare',
      }),
      'Failed to create group/turnout'
    )
  })
})
