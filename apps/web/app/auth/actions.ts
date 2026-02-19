'use server'

import { parsePhoneNumberFromString } from 'libphonenumber-js'
import {
  checkPhoneExists,
  createUserWithCredential,
  getCredentialByPhone,
  checkRateLimit,
  incrementRateLimit,
  sendOTPCode,
  checkOTPCode,
  createSession,
  deleteSession,
  setSessionCookie,
  clearSessionCookie,
} from '@/lib/auth'
import { cookies } from 'next/headers'
import { logger } from '@/lib/logger'

// --- Validation helpers ---

function normalizePhone(raw: string): { phone: string } | { error: string } {
  const parsed = parsePhoneNumberFromString(raw)
  if (!parsed || !parsed.isValid()) {
    return { error: 'Invalid phone number. Use format: +1234567890' }
  }
  return { phone: parsed.format('E.164') }
}

function validateDisplayName(name: string): string | null {
  if (name.length === 0 || name.length > 50) {
    return 'Display name must be 1-50 characters'
  }
  if (!/^[a-zA-Z0-9 \-_]+$/.test(name)) {
    return 'Display name contains invalid characters'
  }
  return null
}

// --- Actions ---

/**
 * Check whether a phone number is new or returning.
 * Called when the user submits the phone input form.
 */
export async function checkPhoneAction(
  phone: string
): Promise<{ isNewUser: boolean } | { error: string }> {
  const normalized = normalizePhone(phone)
  if ('error' in normalized) return normalized

  const result = await checkPhoneExists(normalized.phone)
  if (result.isErr()) return { error: result.error }
  return result.value
}

/**
 * Send an OTP code to the given phone number.
 * Respects application-level rate limits (1/min, 5/day).
 */
export async function sendOTPAction(
  phone: string
): Promise<{ success: true } | { error: string }> {
  const normalized = normalizePhone(phone)
  if ('error' in normalized) return normalized

  // Rate limit check
  const rateResult = await checkRateLimit(normalized.phone)
  if (rateResult.isErr()) {
    const err = rateResult.error
    if (err.code === 'RATE_LIMITED_MINUTE') {
      return { error: 'Please wait 60 seconds before requesting another code' }
    }
    return { error: 'Too many codes requested today. Try again tomorrow.' }
  }

  // Send the OTP
  const sendResult = await sendOTPCode(normalized.phone)
  if (sendResult.isErr()) {
    logger.error({ phone: normalized.phone, err: sendResult.error }, 'sendOTPCode failed')
    return { error: 'Verification system unavailable. Please try again.' }
  }

  // Track the send for rate limiting
  const incrementResult = await incrementRateLimit(normalized.phone)
  if (incrementResult.isErr()) {
    // Rate limit tracking failed but OTP was sent — not a user-facing error
    logger.warn({ phone: normalized.phone, err: incrementResult.error }, 'incrementRateLimit failed after successful OTP send')
  }

  return { success: true }
}

/**
 * Verify the OTP code, create or find the user, establish a session.
 * This is the terminal action in the auth flow.
 */
export async function signInAction(
  phone: string,
  code: string,
  displayName?: string
): Promise<{ success: true; isNewUser: boolean } | { error: string }> {
  const normalized = normalizePhone(phone)
  if ('error' in normalized) return normalized

  // Validate code format (4-10 digits per Twilio Verify)
  if (!/^\d{4,10}$/.test(code)) {
    return { error: 'Invalid verification code' }
  }

  // Validate display name if provided
  if (displayName) {
    const nameErr = validateDisplayName(displayName)
    if (nameErr) return { error: nameErr }
  }

  // Verify OTP
  const otpResult = await checkOTPCode(normalized.phone, code)
  if (otpResult.isErr()) {
    const err = otpResult.error
    if (err.code === 'CODE_EXPIRED') {
      return { error: 'This code has expired. Request a new one.' }
    }
    if (err.code === 'INVALID_CODE') {
      return { error: 'Invalid verification code' }
    }
    logger.error({ phone: normalized.phone, err: otpResult.error }, 'checkOTPCode failed')
    return { error: 'Verification system unavailable. Please try again.' }
  }

  // Find or create user
  const existingCred = await getCredentialByPhone(normalized.phone)
  const isNewUser = !existingCred

  let userId: string
  if (isNewUser) {
    const createResult = await createUserWithCredential(
      normalized.phone,
      displayName
    )
    if (createResult.isErr()) return { error: createResult.error }
    userId = createResult.value.userId
  } else {
    userId = existingCred.userId
  }

  // Create session
  const sessionResult = await createSession(userId)
  if (sessionResult.isErr()) return { error: sessionResult.error }

  setSessionCookie(sessionResult.value)

  return { success: true, isNewUser }
}

/**
 * Destroy the current session and clear the cookie.
 * Always succeeds — even if there's no active session.
 */
export async function logoutAction(): Promise<{ success: true }> {
  const cookieStore = cookies()
  const token = cookieStore.get('session_token')?.value

  if (token) {
    await deleteSession(token)
  }

  clearSessionCookie()
  return { success: true }
}
