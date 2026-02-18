import { ResultAsync, okAsync, errAsync } from 'neverthrow'
import { prisma } from '@/lib/db'
import twilio from 'twilio'

// -- Error types for callers to discriminate on --
export type RateLimitError =
  | { code: 'RATE_LIMITED_MINUTE' }
  | { code: 'RATE_LIMITED_DAY' }

export type OTPError =
  | { code: 'INVALID_CODE' }
  | { code: 'CODE_EXPIRED' }
  | { code: 'TWILIO_ERROR'; message: string }

// Lazy-init Twilio client — only created when actually needed,
// which means tests that mock the module never hit real credentials.
function getTwilioClient() {
  return twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!
  )
}

/**
 * Check application-level rate limits for OTP sends.
 * Rules: max 1 per 60s, max 5 per day (resets at midnight UTC).
 * No record means phone has never requested an OTP → allowed.
 */
export function checkRateLimit(
  phone: string
): ResultAsync<void, RateLimitError> {
  return ResultAsync.fromPromise(
    prisma.phoneRateLimit.findUnique({ where: { phone } }),
    () => ({ code: 'RATE_LIMITED_MINUTE' as const }) // DB error → treat as rate limited (fail safe)
  ).andThen((record) => {
    if (!record) return okAsync(undefined)

    const now = new Date()

    // Per-minute check: was the last OTP sent less than 60s ago?
    if (record.lastOTPSentAt) {
      const secondsSince = (now.getTime() - record.lastOTPSentAt.getTime()) / 1000
      if (secondsSince < 60) {
        return errAsync({ code: 'RATE_LIMITED_MINUTE' as const })
      }
    }

    // Per-day check: has the daily counter been hit, and is it still "today"?
    if (record.otpCountToday >= 5 && record.otpCountResetAt) {
      const resetDate = record.otpCountResetAt.toISOString().slice(0, 10)
      const todayDate = now.toISOString().slice(0, 10)
      if (resetDate === todayDate) {
        return errAsync({ code: 'RATE_LIMITED_DAY' as const })
      }
      // otpCountResetAt is before today → counter is stale, allow through
    }

    return okAsync(undefined)
  })
}

/**
 * Upsert the rate limit record after a successful OTP send.
 * Resets the daily counter if we've rolled past midnight UTC.
 */
export function incrementRateLimit(
  phone: string
): ResultAsync<void, string> {
  const now = new Date()
  const todayDate = now.toISOString().slice(0, 10)

  return ResultAsync.fromPromise(
    (async () => {
      const existing = await prisma.phoneRateLimit.findUnique({ where: { phone } })

      // Determine if the daily counter needs resetting
      const shouldReset = !existing?.otpCountResetAt ||
        existing.otpCountResetAt.toISOString().slice(0, 10) !== todayDate

      await prisma.phoneRateLimit.upsert({
        where: { phone },
        create: {
          phone,
          lastOTPSentAt: now,
          otpCountToday: 1,
          otpCountResetAt: now,
        },
        update: {
          lastOTPSentAt: now,
          otpCountToday: shouldReset ? 1 : { increment: 1 },
          ...(shouldReset ? { otpCountResetAt: now } : {}),
        },
      })
    })(),
    (e) => `Database error updating rate limit: ${(e as Error).message}`
  )
}

/**
 * Send an OTP code via Twilio Verify.
 * When TEST_OTP_BYPASS is set, skips the real API call — the code "000000"
 * will be accepted by checkOTPCode instead.
 */
export function sendOTPCode(
  phone: string
): ResultAsync<void, { code: 'TWILIO_ERROR'; message: string }> {
  // CI/test bypass — no Twilio credentials needed
  if (process.env.TEST_OTP_BYPASS === 'true') {
    return okAsync(undefined)
  }

  return ResultAsync.fromPromise(
    getTwilioClient().verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verifications.create({
        to: phone,
        channel: 'sms',
        templateSid: process.env.TWILIO_VERIFY_TEMPLATE_SID!,
      }),
    (e) => ({
      code: 'TWILIO_ERROR' as const,
      message: (e as Error).message,
    })
  ).map(() => undefined)
}

/**
 * Verify an OTP code via Twilio Verify.
 * When TEST_OTP_BYPASS is set, accepts "000000" and rejects everything else.
 */
export function checkOTPCode(
  phone: string,
  code: string
): ResultAsync<void, OTPError> {
  // CI/test bypass — accept the magic code, reject everything else
  if (process.env.TEST_OTP_BYPASS === 'true') {
    return code === '000000'
      ? okAsync(undefined)
      : errAsync({ code: 'INVALID_CODE' as const })
  }

  return ResultAsync.fromPromise(
    getTwilioClient().verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verificationChecks.create({ to: phone, code }),
    (e) => ({
      code: 'TWILIO_ERROR' as const,
      message: (e as Error).message,
    })
  ).andThen((check) => {
    if (check.status === 'approved') return okAsync(undefined)
    if (check.status === 'expired') return errAsync({ code: 'CODE_EXPIRED' as const })
    // Any other status (pending, canceled, etc.) = wrong code
    return errAsync({ code: 'INVALID_CODE' as const })
  })
}
