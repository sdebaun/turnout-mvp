import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prisma } from '@/lib/db'

// Mock twilio before importing otp module — the mock intercepts the import
// so no real Twilio client is ever created.
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

// Import AFTER mocking
import { checkRateLimit, incrementRateLimit, sendOTPCode, checkOTPCode } from './otp'

beforeEach(async () => {
  await prisma.session.deleteMany()
  await prisma.credential.deleteMany()
  await prisma.user.deleteMany()
  await prisma.phoneRateLimit.deleteMany()
  mockVerificationsCreate.mockReset()
  mockVerificationChecksCreate.mockReset()
  // Ensure OTP bypass is off for these tests
  delete process.env.TEST_OTP_BYPASS
})

describe('checkRateLimit', () => {
  it('returns ok() when no PhoneRateLimit record exists', async () => {
    const result = await checkRateLimit('+15555550200')
    expect(result.isOk()).toBe(true)
  })

  it('returns RATE_LIMITED_MINUTE if lastOTPSentAt is within 60s', async () => {
    await prisma.phoneRateLimit.create({
      data: {
        phone: '+15555550201',
        lastOTPSentAt: new Date(), // just now
        otpCountToday: 1,
        otpCountResetAt: new Date(),
      },
    })

    const result = await checkRateLimit('+15555550201')
    expect(result.isErr()).toBe(true)
    expect(result._unsafeUnwrapErr()).toEqual({ code: 'RATE_LIMITED_MINUTE' })
  })

  it('returns RATE_LIMITED_DAY if otpCountToday >= 5 and reset is today', async () => {
    await prisma.phoneRateLimit.create({
      data: {
        phone: '+15555550202',
        lastOTPSentAt: new Date(Date.now() - 120_000), // 2 min ago (past minute limit)
        otpCountToday: 5,
        otpCountResetAt: new Date(), // today
      },
    })

    const result = await checkRateLimit('+15555550202')
    expect(result.isErr()).toBe(true)
    expect(result._unsafeUnwrapErr()).toEqual({ code: 'RATE_LIMITED_DAY' })
  })

  it('returns ok() and allows through if otpCountResetAt is before today', async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    await prisma.phoneRateLimit.create({
      data: {
        phone: '+15555550203',
        lastOTPSentAt: yesterday,
        otpCountToday: 5,
        otpCountResetAt: yesterday, // yesterday — counter is stale
      },
    })

    const result = await checkRateLimit('+15555550203')
    expect(result.isOk()).toBe(true)
  })
})

describe('sendOTPCode', () => {
  it('returns ok() on successful Twilio verifications.create', async () => {
    mockVerificationsCreate.mockResolvedValue({ status: 'pending' })

    const result = await sendOTPCode('+15555550204')
    expect(result.isOk()).toBe(true)
    expect(mockVerificationsCreate).toHaveBeenCalledWith({
      to: '+15555550204',
      channel: 'sms',
      templateSid: process.env.TWILIO_VERIFY_TEMPLATE_SID,
    })
  })

  it('returns TWILIO_ERROR when Twilio API throws', async () => {
    mockVerificationsCreate.mockRejectedValue(new Error('Service unavailable'))

    const result = await sendOTPCode('+15555550205')
    expect(result.isErr()).toBe(true)
    expect(result._unsafeUnwrapErr()).toEqual({
      code: 'TWILIO_ERROR',
      message: 'Service unavailable',
    })
  })
})

describe('checkOTPCode', () => {
  it('returns ok() when Twilio returns status: approved', async () => {
    mockVerificationChecksCreate.mockResolvedValue({ status: 'approved' })

    const result = await checkOTPCode('+15555550206', '123456')
    expect(result.isOk()).toBe(true)
  })

  it('returns INVALID_CODE for non-approved/non-expired status', async () => {
    mockVerificationChecksCreate.mockResolvedValue({ status: 'pending' })

    const result = await checkOTPCode('+15555550207', '999999')
    expect(result.isErr()).toBe(true)
    expect(result._unsafeUnwrapErr()).toEqual({ code: 'INVALID_CODE' })
  })

  it('returns CODE_EXPIRED when Twilio returns status: expired', async () => {
    mockVerificationChecksCreate.mockResolvedValue({ status: 'expired' })

    const result = await checkOTPCode('+15555550208', '123456')
    expect(result.isErr()).toBe(true)
    expect(result._unsafeUnwrapErr()).toEqual({ code: 'CODE_EXPIRED' })
  })

  it('returns TWILIO_ERROR when SDK throws unexpectedly', async () => {
    mockVerificationChecksCreate.mockRejectedValue(new Error('Network failure'))

    const result = await checkOTPCode('+15555550209', '123456')
    expect(result.isErr()).toBe(true)
    expect(result._unsafeUnwrapErr()).toEqual({
      code: 'TWILIO_ERROR',
      message: 'Network failure',
    })
  })
})
