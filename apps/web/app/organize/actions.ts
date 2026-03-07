'use server'

import { getUser, createSession, setSessionCookie, checkOTPCode, getCredentialByPhone, createUserWithCredential } from '@/lib/auth'
import { toUTCDate, createGroupWithTurnout } from '@/lib/groups'
import { logger } from '@/lib/logger'
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import type { LocationData } from './schemas'
export type { LocationData }

export type CreateGroupWithTurnoutInput = {
  groupName: string
  mission: string
  turnoutTitle: string
  description?: string
  location: LocationData
  turnoutDate: string // YYYY-MM-DD
  turnoutTime: string // HH:MM
  turnoutTimezone: string // IANA timezone name
}

type ActionResult =
  | { success: true; turnoutSlug: string }
  | { error: string }

/**
 * Thin orchestrator: validates input, converts timezone, delegates to
 * createGroupWithTurnout. Auth required — returns error if no session.
 */
export async function createGroupWithTurnoutAction(
  data: CreateGroupWithTurnoutInput
): Promise<ActionResult> {
  const user = await getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Validate required fields
  const requiredFields: Array<{ field: string; value: string | undefined; maxLen?: number }> = [
    { field: 'Group name', value: data.groupName, maxLen: 100 },
    { field: 'Mission', value: data.mission, maxLen: 500 },
    { field: 'Turnout title', value: data.turnoutTitle, maxLen: 100 },
    { field: 'Location name', value: data.location?.name, maxLen: 200 },
    { field: 'Turnout date', value: data.turnoutDate },
    { field: 'Turnout time', value: data.turnoutTime },
    { field: 'Turnout timezone', value: data.turnoutTimezone },
  ]

  for (const { field, value, maxLen } of requiredFields) {
    if (!value || value.trim().length === 0) {
      return { error: `${field} is required` }
    }
    if (maxLen && value.length > maxLen) {
      return { error: `${field} must be ${maxLen} characters or less` }
    }
  }

  // Optional field length check
  if (data.description && data.description.length > 1000) {
    return { error: 'Description must be 1000 characters or less' }
  }

  // Convert local date/time/tz to UTC
  const startsAt = toUTCDate(data.turnoutDate, data.turnoutTime, data.turnoutTimezone)

  // Must be in the future
  if (startsAt <= new Date()) {
    return { error: 'Turnout date must be in the future' }
  }

  const result = await createGroupWithTurnout(user.id, {
    groupName: data.groupName.trim(),
    mission: data.mission.trim(),
    turnoutTitle: data.turnoutTitle.trim(),
    description: data.description?.trim() || undefined,
    location: data.location,
    startsAt,
  })

  if (result.isErr()) {
    logger.error(
      { userId: user.id, groupName: data.groupName, error: result.error },
      'Failed to create group/turnout'
    )
    return { error: result.error }
  }

  return { success: true, turnoutSlug: result.value.turnoutSlug }
}

/**
 * Single-action OTP verification + group creation for the unauthenticated wizard flow.
 *
 * Two separate server actions (signInAction → createGroupWithTurnoutAction) are a race:
 * the session cookie set by signInAction may not yet be in the browser's cookie jar when
 * the second POST fires. Combining into one action fixes that — userId is in-memory,
 * no cookie round-trip. On success, redirect() is called so the Set-Cookie header and
 * the 303 are in the SAME HTTP response; browser applies cookie then follows redirect,
 * guaranteeing the session is present on the next page load.
 *
 * Returns only on error (redirect() never returns on success).
 */
export async function verifyOtpAndCreateGroupAction(
  phone: string,
  code: string,
  displayName: string | undefined,
  data: CreateGroupWithTurnoutInput
): Promise<{ error: string } | { success: true; turnoutSlug: string }> {
  // Normalize phone
  const parsed = parsePhoneNumberFromString(phone)
  if (!parsed?.isValid()) return { error: 'Invalid phone number' }
  const normalizedPhone = parsed.format('E.164')

  // Verify OTP
  const otpResult = await checkOTPCode(normalizedPhone, code)
  if (otpResult.isErr()) {
    const err = otpResult.error
    if (err.code === 'CODE_EXPIRED') return { error: 'This code has expired. Request a new one.' }
    if (err.code === 'INVALID_CODE') return { error: 'Invalid verification code' }
    return { error: 'Verification system unavailable. Please try again.' }
  }

  // Find or create user
  const existingCred = await getCredentialByPhone(normalizedPhone)
  const isNewUser = !existingCred
  let userId: string
  if (isNewUser) {
    const createResult = await createUserWithCredential(normalizedPhone, displayName)
    if (createResult.isErr()) return { error: createResult.error }
    userId = createResult.value.userId
  } else {
    userId = existingCred.userId
  }

  // Create session and set cookie
  const sessionResult = await createSession(userId)
  if (sessionResult.isErr()) return { error: sessionResult.error }
  setSessionCookie(sessionResult.value)

  // Validate input (same checks as createGroupWithTurnoutAction)
  const requiredFields: Array<{ field: string; value: string | undefined; maxLen?: number }> = [
    { field: 'Group name', value: data.groupName, maxLen: 100 },
    { field: 'Mission', value: data.mission, maxLen: 500 },
    { field: 'Turnout title', value: data.turnoutTitle, maxLen: 100 },
    { field: 'Location name', value: data.location?.name, maxLen: 200 },
    { field: 'Turnout date', value: data.turnoutDate },
    { field: 'Turnout time', value: data.turnoutTime },
    { field: 'Turnout timezone', value: data.turnoutTimezone },
  ]
  for (const { field, value, maxLen } of requiredFields) {
    if (!value || value.trim().length === 0) return { error: `${field} is required` }
    if (maxLen && value.length > maxLen) return { error: `${field} must be ${maxLen} characters or less` }
  }

  const startsAt = toUTCDate(data.turnoutDate, data.turnoutTime, data.turnoutTimezone)
  if (startsAt <= new Date()) return { error: 'Turnout date must be in the future' }

  const result = await createGroupWithTurnout(userId, {
    groupName: data.groupName.trim(),
    mission: data.mission.trim(),
    turnoutTitle: data.turnoutTitle.trim(),
    description: data.description?.trim() || undefined,
    location: data.location,
    startsAt,
  })

  if (result.isErr()) {
    logger.error({ userId, groupName: data.groupName, error: result.error }, 'verifyOtpAndCreateGroup: createGroupWithTurnout failed')
    return { error: result.error }
  }

  // Session cookie is set above via setSessionCookie(). The Set-Cookie header is in the
  // HTTP response before the body, so the cookie is in the browser jar by the time
  // this Promise resolves on the client. The caller uses router.push() for navigation.
  return { success: true, turnoutSlug: result.value.turnoutSlug }
}
