'use server'

import { getUser } from '@/lib/auth/sessions'
import { toUTCDate, createGroupWithTurnout } from '@/lib/groups'
import { logger } from '@/lib/logger'

export type LocationData = {
  name: string
  formattedAddress?: string
  lat?: number
  lng?: number
  placeId?: string
}

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
