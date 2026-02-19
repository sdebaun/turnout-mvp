import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prisma } from '@/lib/db'
import { CredentialType } from '@prisma/client'

// Mock twilio (same as otp.test.ts — the auth library uses it under the hood)
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

// Import actions AFTER mocks are in place
// Using relative import because vitest doesn't alias apps/web paths
import { checkPhoneAction, sendOTPAction, signInAction, logoutAction } from './actions'

beforeEach(async () => {
  await prisma.session.deleteMany()
  await prisma.credential.deleteMany()
  await prisma.user.deleteMany()
  await prisma.phoneRateLimit.deleteMany()
  mockCookieStore.clear()
  mockVerificationsCreate.mockReset()
  mockVerificationChecksCreate.mockReset()
  delete process.env.TEST_OTP_BYPASS
})

describe('checkPhoneAction', () => {
  it('returns isNewUser: true for an unknown phone', async () => {
    const result = await checkPhoneAction('+12025550100')
    expect(result).toEqual({ isNewUser: true })
  })

  it('returns isNewUser: false for a known phone', async () => {
    await prisma.user.create({
      data: {
        displayName: 'ActionTest',
        credentials: {
          create: {
            credentialType: CredentialType.PHONE,
            credential: '+12025550101',
          },
        },
      },
    })

    const result = await checkPhoneAction('+12025550101')
    expect(result).toEqual({ isNewUser: false })
  })

  it('returns error for invalid phone format', async () => {
    const result = await checkPhoneAction('not-a-phone')
    expect(result).toHaveProperty('error')
    expect((result as { error: string }).error).toContain('Invalid phone number')
  })
})

describe('sendOTPAction', () => {
  it('returns success: true when OTP is sent', async () => {
    mockVerificationsCreate.mockResolvedValue({ status: 'pending' })

    const result = await sendOTPAction('+12025550102')
    expect(result).toEqual({ success: true })
  })

  it('returns error when application rate limit is exceeded', async () => {
    // Seed a rate limit record that was just hit
    await prisma.phoneRateLimit.create({
      data: {
        phone: '+12025550103',
        lastOTPSentAt: new Date(),
        otpCountToday: 1,
        otpCountResetAt: new Date(),
      },
    })

    const result = await sendOTPAction('+12025550103')
    expect(result).toHaveProperty('error')
    expect((result as { error: string }).error).toContain('wait 60 seconds')
  })

  it('returns error on Twilio API failure', async () => {
    mockVerificationsCreate.mockRejectedValue(new Error('API down'))

    const result = await sendOTPAction('+12025550104')
    expect(result).toHaveProperty('error')
    expect((result as { error: string }).error).toContain('unavailable')
  })
})

describe('signInAction', () => {
  it('creates User + Credential + Session for a new user', async () => {
    mockVerificationChecksCreate.mockResolvedValue({ status: 'approved' })

    const result = await signInAction('+12025550105', '123456', 'NewActionUser')
    expect(result).toEqual({ success: true, isNewUser: true })

    // Verify session cookie was set
    expect(mockCookieStore.has('session_token')).toBe(true)

    // Verify user was created with correct name
    const cred = await prisma.credential.findUnique({
      where: {
        credentialType_credential: {
          credentialType: CredentialType.PHONE,
          credential: '+12025550105',
        },
      },
      include: { user: true },
    })
    expect(cred?.user.displayName).toBe('NewActionUser')
  })

  it('creates Session only for a returning user', async () => {
    // Seed existing user
    await prisma.user.create({
      data: {
        displayName: 'ReturningUser',
        credentials: {
          create: {
            credentialType: CredentialType.PHONE,
            credential: '+12025550106',
          },
        },
      },
    })
    mockVerificationChecksCreate.mockResolvedValue({ status: 'approved' })

    const result = await signInAction('+12025550106', '123456')
    expect(result).toEqual({ success: true, isNewUser: false })
    expect(mockCookieStore.has('session_token')).toBe(true)
  })

  it('uses the provided displayName when creating a new user', async () => {
    mockVerificationChecksCreate.mockResolvedValue({ status: 'approved' })

    await signInAction('+12025550107', '123456', 'CustomName')

    const cred = await prisma.credential.findUnique({
      where: {
        credentialType_credential: {
          credentialType: CredentialType.PHONE,
          credential: '+12025550107',
        },
      },
      include: { user: true },
    })
    expect(cred?.user.displayName).toBe('CustomName')
  })

  it('returns error for an invalid OTP code', async () => {
    mockVerificationChecksCreate.mockResolvedValue({ status: 'pending' })

    const result = await signInAction('+12025550108', '999999')
    expect(result).toHaveProperty('error')
    expect((result as { error: string }).error).toContain('Invalid verification code')
  })
})

describe('logoutAction', () => {
  it('deletes Session from DB, clears cookie, returns success', async () => {
    // Create a user and session
    const user = await prisma.user.create({
      data: { displayName: 'LogoutTest' },
    })
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token: 'test_logout_token_abc123',
      },
    })
    mockCookieStore.set('session_token', { value: 'test_logout_token_abc123' })

    const result = await logoutAction()
    expect(result).toEqual({ success: true })

    // Cookie should be cleared
    expect(mockCookieStore.has('session_token')).toBe(false)

    // Session should be deleted from DB
    const dbSession = await prisma.session.findUnique({
      where: { token: 'test_logout_token_abc123' },
    })
    expect(dbSession).toBeNull()
  })
})
