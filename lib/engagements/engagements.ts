import { ResultAsync, ok, err } from 'neverthrow'
import { prisma } from '@/lib/db'
import { EngagementStatus, Prisma } from '@prisma/client'

// Typed errors the caller can match on — no string-matching, no instanceof.
// OPPORTUNITY_NOT_FOUND is theoretically impossible in MVP (TDD0002 always
// creates exactly one) but we check anyway so the action stays honest.
export type EngagementError =
  | { code: 'ALREADY_RSVPD' }
  | { code: 'OPPORTUNITY_NOT_FOUND' }
  | { code: 'DB_ERROR'; message: string }

/**
 * RSVP a user to an opportunity. Handles three cases:
 * - Fresh RSVP: creates a new CONFIRMED engagement
 * - Re-RSVP after cancellation: updates existing record back to CONFIRMED
 * - Duplicate: returns ALREADY_RSVPD without touching the DB
 *
 * The @@unique([userId, opportunityId]) constraint is the DB-level safety net,
 * but we check first to give a user-friendly error rather than a P2002 explosion.
 */
export function createEngagement(
  userId: string,
  opportunityId: string
): ResultAsync<{ id: string; status: EngagementStatus }, EngagementError> {
  const work = async (): Promise<{ id: string; status: EngagementStatus }> => {
    // Verify opportunity exists first — fail fast before touching engagement table
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
    })
    if (!opportunity) {
      throw { code: 'OPPORTUNITY_NOT_FOUND' } as EngagementError
    }

    // Check for existing engagement
    const existing = await prisma.engagement.findUnique({
      where: { userId_opportunityId: { userId, opportunityId } },
    })

    if (existing) {
      if (existing.status === EngagementStatus.CONFIRMED) {
        throw { code: 'ALREADY_RSVPD' } as EngagementError
      }
      // Was CANCELED (or any other non-CONFIRMED status) — re-confirm.
      // Keeps engagement history intact rather than creating a duplicate row.
      const updated = await prisma.engagement.update({
        where: { id: existing.id },
        data: {
          status: EngagementStatus.CONFIRMED,
          canceledAt: null,
          confirmedAt: new Date(),
        },
      })
      return { id: updated.id, status: updated.status }
    }

    // No existing engagement — create fresh
    const created = await prisma.engagement.create({
      data: { userId, opportunityId, status: EngagementStatus.CONFIRMED },
    })
    return { id: created.id, status: created.status }
  }

  return ResultAsync.fromPromise(work(), (e) => {
    // Re-surface typed errors we threw ourselves
    if (
      typeof e === 'object' &&
      e !== null &&
      'code' in e &&
      (e as { code: string }).code === 'ALREADY_RSVPD'
    ) {
      return { code: 'ALREADY_RSVPD' } as EngagementError
    }
    if (
      typeof e === 'object' &&
      e !== null &&
      'code' in e &&
      (e as { code: string }).code === 'OPPORTUNITY_NOT_FOUND'
    ) {
      return { code: 'OPPORTUNITY_NOT_FOUND' } as EngagementError
    }
    // P2002 unique constraint violation — two concurrent RSVP requests raced past the
    // findUnique check and both hit create(). The second request lost the race but the
    // user IS successfully RSVPed (via the first). Treat as ALREADY_RSVPD, not a DB error.
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      return { code: 'ALREADY_RSVPD' } as EngagementError
    }
    return { code: 'DB_ERROR', message: (e as Error).message ?? String(e) } as EngagementError
  })
}

/**
 * Count CONFIRMED engagements for an opportunity. Used for the "N people are going"
 * display. Returns null on any DB error — callers must treat null as "hide the
 * count entirely" rather than showing a misleading 0.
 */
export async function getRsvpCount(opportunityId: string): Promise<number | null> {
  try {
    return await prisma.engagement.count({
      where: { opportunityId, status: EngagementStatus.CONFIRMED },
    })
  } catch {
    return null
  }
}

/**
 * Fetch an existing engagement for (userId, opportunityId). Returns null if none found.
 * Used to render the "You're going!" state for returning authenticated visitors.
 */
export async function getUserEngagement(
  userId: string,
  opportunityId: string
) {
  try {
    return await prisma.engagement.findUnique({
      where: { userId_opportunityId: { userId, opportunityId } },
    })
  } catch {
    return null
  }
}

/**
 * Fetch the default (and in MVP, only) opportunity for a turnout.
 * The RSVP action calls this so it never needs to know the opportunityId directly.
 * In TDD0006, this evolves to let participants choose an opportunity.
 */
export async function getDefaultOpportunity(turnoutId: string) {
  try {
    return await prisma.opportunity.findFirst({ where: { turnoutId } })
  } catch {
    return null
  }
}
