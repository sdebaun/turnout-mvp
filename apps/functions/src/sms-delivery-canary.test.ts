import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock twilio before importing the handler — vi.mock is hoisted
vi.mock('twilio', () => {
  return {
    default: vi.fn(),
  }
})

// Mock the waitForSms helper so we don't actually poll anything
vi.mock('@/lib/test-helpers/wait-for-sms', () => ({
  waitForSms: vi.fn(),
}))

import twilio from 'twilio'
import { waitForSms } from '@/lib/test-helpers/wait-for-sms'
import { handler } from './sms-delivery-canary'

const mockTwilio = twilio as unknown as ReturnType<typeof vi.fn>
const mockWaitForSms = waitForSms as ReturnType<typeof vi.fn>

describe('sms-delivery-canary handler', () => {
  const mockCreate = vi.fn()
  const mockCheckCreate = vi.fn()

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})

    // Wire up env vars the handler expects
    process.env.TWILIO_ACCOUNT_SID = 'AC_test_sid'
    process.env.TWILIO_AUTH_TOKEN = 'test_auth_token'
    process.env.TWILIO_VERIFY_SERVICE_SID = 'VA_test_service'
    process.env.TWILIO_VERIFY_TEMPLATE_SID = 'HJ_test_template'
    process.env.TWILIO_TEST_SMS_RECIPIENT_PHONE_NUMBER = '+15005550006'

    // Build the mock client chain that mirrors Twilio's deeply nested API.
    // client.verify.v2.services(sid).verifications.create(...)
    // client.verify.v2.services(sid).verificationChecks.create(...)
    mockCreate.mockResolvedValue({ status: 'pending', sid: 'VE_test' })
    mockCheckCreate.mockResolvedValue({ status: 'approved', sid: 'VE_test' })

    const mockServices = vi.fn().mockReturnValue({
      verifications: { create: mockCreate },
      verificationChecks: { create: mockCheckCreate },
    })

    mockTwilio.mockReturnValue({
      verify: { v2: { services: mockServices } },
      messages: { list: vi.fn().mockResolvedValue([]) },
    })

    // Default: waitForSms returns a valid 6-digit code
    mockWaitForSms.mockResolvedValue('123456')
  })

  it('sends OTP, waits for SMS, verifies code, and returns 200 on success', async () => {
    const result = await handler()

    expect(result.statusCode).toBe(200)
    const body = JSON.parse(result.body)
    expect(body.ok).toBe(true)
    expect(body).toHaveProperty('timestamp')

    // Verify OTP was sent with correct params
    expect(mockCreate).toHaveBeenCalledWith({
      to: '+15005550006',
      channel: 'sms',
      templateSid: 'HJ_test_template',
    })

    // Verify waitForSms was called with the right number
    expect(mockWaitForSms).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '+15005550006',
        timeoutMs: 45_000,
      })
    )

    // Verify the code was checked
    expect(mockCheckCreate).toHaveBeenCalledWith({
      to: '+15005550006',
      code: '123456',
    })
  })

  it('throws when verification check returns non-approved status', async () => {
    mockCheckCreate.mockResolvedValue({ status: 'pending', sid: 'VE_test' })

    await expect(handler()).rejects.toThrow(
      'Canary verification failed: status=pending'
    )
  })

  it('throws when waitForSms times out', async () => {
    mockWaitForSms.mockRejectedValue(
      new Error('waitForSms timed out after 45000ms waiting for SMS to +15005550006')
    )

    await expect(handler()).rejects.toThrow('waitForSms timed out')
  })

  it('throws when Twilio Verify API fails to send OTP', async () => {
    mockCreate.mockRejectedValue(new Error('Twilio API error: 429 rate limited'))

    await expect(handler()).rejects.toThrow('Twilio API error')
  })
})
