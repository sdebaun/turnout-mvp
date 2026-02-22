import { ResultAsync, ok, err } from 'neverthrow'
import { customAlphabet } from 'nanoid/non-secure'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { Prisma } from '@prisma/client'

// 8-char slug using an alphabet that excludes 0/O/1/l/I to prevent
// misreads in shared URLs. Bob texts this to his friends — it needs
// to survive a squint at a phone screen.
const SLUG_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz'
const SLUG_LENGTH = 8
const MAX_SLUG_RETRIES = 3

const nanoid = customAlphabet(SLUG_ALPHABET, SLUG_LENGTH)

export function generateTurnoutSlug(): string {
  return nanoid()
}

// What the caller passes in — the server action validates and assembles this.
export interface CreateGroupWithTurnoutData {
  groupName: string
  mission: string
  turnoutTitle: string
  description?: string
  location: {
    name: string
    formattedAddress?: string
    lat?: number
    lng?: number
    placeId?: string
  }
  startsAt: Date
  timezone: string // IANA timezone from the organizer's browser — stored so page.tsx can display "7pm Eastern" not "12am UTC"
}

/**
 * Create all 5 records atomically: Location → Group → GroupOrganizer → Turnout → Opportunity.
 * If the generated slug collides (P2002 unique constraint), retry with a new slug up to 3 times.
 * Returns the IDs and slug on success.
 */
export function createGroupWithTurnout(
  userId: string,
  data: CreateGroupWithTurnoutData
): ResultAsync<{ groupId: string; turnoutId: string; turnoutSlug: string }, string> {
  return ResultAsync.fromPromise(
    attemptCreate(userId, data, 0),
    (e) => `Failed to create group/turnout: ${(e as Error).message}`
  )
}

async function attemptCreate(
  userId: string,
  data: CreateGroupWithTurnoutData,
  attempt: number
): Promise<{ groupId: string; turnoutId: string; turnoutSlug: string }> {
  const slug = generateTurnoutSlug()

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Location
      const location = await tx.location.create({
        data: {
          name: data.location.name,
          formattedAddress: data.location.formattedAddress,
          lat: data.location.lat,
          lng: data.location.lng,
          placeId: data.location.placeId,
        },
      })

      // 2. Group
      const group = await tx.group.create({
        data: {
          name: data.groupName,
          mission: data.mission,
        },
      })

      // 3. GroupOrganizer — link the creator to the group
      await tx.groupOrganizer.create({
        data: {
          groupId: group.id,
          userId,
        },
      })

      // 4. Turnout — with the generated slug
      const turnout = await tx.turnout.create({
        data: {
          slug,
          title: data.turnoutTitle,
          description: data.description,
          groupId: group.id,
          primaryLocationId: location.id,
          createdByUserId: userId,
          startsAt: data.startsAt,
          timezone: data.timezone,
        },
      })

      // 5. Default Opportunity — "Show Up" with no overrides
      await tx.opportunity.create({
        data: {
          turnoutId: turnout.id,
          name: 'Show Up',
        },
      })

      return { groupId: group.id, turnoutId: turnout.id, turnoutSlug: slug }
    })

    return result
  } catch (e) {
    // Slug collision: Prisma P2002 on the slug unique constraint
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002' &&
      (e.meta?.target as string[] | undefined)?.includes('slug')
    ) {
      if (attempt < MAX_SLUG_RETRIES - 1) {
        logger.warn({ slug, attempt: attempt + 1 }, 'Slug collision, retrying')
        return attemptCreate(userId, data, attempt + 1)
      }
      throw new Error('Failed to generate unique slug after 3 attempts')
    }
    throw e
  }
}

// The shape returned by getTurnoutBySlug — turnout with its group and location.
export type TurnoutWithDetails = Awaited<ReturnType<typeof getTurnoutBySlug>> & {}

/**
 * Public lookup: find a turnout by its slug, including the group and primary location.
 * Returns null if not found — that's a valid state (bad link), not an error.
 */
export async function getTurnoutBySlug(slug: string) {
  return prisma.turnout.findUnique({
    where: { slug },
    include: {
      group: true,
      primaryLocation: true,
    },
  })
}
