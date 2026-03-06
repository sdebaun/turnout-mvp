import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { EngagementStatus } from '@prisma/client'
import {
  createEngagement,
  getRsvpCount,
  getUserEngagement,
  getDefaultOpportunity,
} from './engagements'

// FK-safe truncation order: children before parents.
// Engagement depends on User and Opportunity; Opportunity depends on Turnout; etc.
beforeEach(async () => {
  await prisma.engagement.deleteMany()
  await prisma.opportunity.deleteMany()
  await prisma.turnout.deleteMany()
  await prisma.groupOrganizer.deleteMany()
  await prisma.group.deleteMany()
  await prisma.location.deleteMany()
  await prisma.session.deleteMany()
  await prisma.credential.deleteMany()
  await prisma.user.deleteMany()
  await prisma.phoneRateLimit.deleteMany()
})

// Creates an additional user for multi-user tests (counts, etc.)
// Uses a direct create; since we only need the user for FK references after seedAll()
// has committed, there's no cross-connection visibility issue here.
async function seedExtraUser(displayName: string) {
  return prisma.user.create({ data: { displayName } })
}

// Full setup: user + group + location + turnout + opportunity — all in one transaction.
// Neon's connection pooler (PgBouncer) in transaction mode can route sequential
// non-transactional queries to different backend connections. FK constraints require
// the referenced row to be visible on the same connection. Wrapping in $transaction
// guarantees a single backend connection for all creates, making FKs visible.
async function seedAll() {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { displayName: 'TestUser' } })
    const location = await tx.location.create({
      data: {
        name: "Joe's Coffee",
        formattedAddress: '123 Main St',
        lat: 40.7128,
        lng: -74.006,
        placeId: 'test-place-id',
      },
    })
    const group = await tx.group.create({
      data: { name: 'Save Willow Creek', mission: 'Stop the gravel mine' },
    })
    const turnout = await tx.turnout.create({
      data: {
        slug: `test-${Math.random().toString(36).slice(2, 10)}`,
        title: 'Test Turnout',
        groupId: group.id,
        primaryLocationId: location.id,
        createdByUserId: user.id,
        startsAt: new Date('2099-06-15T18:00:00Z'),
      },
    })
    const opportunity = await tx.opportunity.create({
      data: { turnoutId: turnout.id, name: 'Show Up' },
    })
    return { user, location, group, turnout, opportunity }
  })
}

// ---

describe('createEngagement', () => {
  it('creates engagement with CONFIRMED status', async () => {
    const { user, opportunity } = await seedAll()

    const result = await createEngagement(user.id, opportunity.id)

    expect(result.isOk()).toBe(true)
    const { id, status } = result._unsafeUnwrap()
    expect(id).toBeTruthy()
    expect(status).toBe(EngagementStatus.CONFIRMED)

    // Verify it's actually in the DB
    const engagement = await prisma.engagement.findUnique({ where: { id } })
    expect(engagement).not.toBeNull()
    expect(engagement?.status).toBe(EngagementStatus.CONFIRMED)
  })

  it('returns ALREADY_RSVPD when called twice with same userId + opportunityId', async () => {
    const { user, opportunity } = await seedAll()

    await createEngagement(user.id, opportunity.id)
    const second = await createEngagement(user.id, opportunity.id)

    expect(second.isErr()).toBe(true)
    expect(second._unsafeUnwrapErr()).toEqual({ code: 'ALREADY_RSVPD' })
  })

  it('re-confirms a CANCELED engagement (status → CONFIRMED, canceledAt cleared)', async () => {
    const { user, opportunity } = await seedAll()

    // Create then cancel
    const first = await createEngagement(user.id, opportunity.id)
    const { id } = first._unsafeUnwrap()
    await prisma.engagement.update({
      where: { id },
      data: { status: EngagementStatus.CANCELED, canceledAt: new Date() },
    })

    // Re-RSVP
    const result = await createEngagement(user.id, opportunity.id)

    expect(result.isOk()).toBe(true)
    expect(result._unsafeUnwrap().status).toBe(EngagementStatus.CONFIRMED)

    const updated = await prisma.engagement.findUnique({ where: { id } })
    expect(updated?.status).toBe(EngagementStatus.CONFIRMED)
    expect(updated?.canceledAt).toBeNull()
  })

  it('returns OPPORTUNITY_NOT_FOUND for a non-existent opportunityId', async () => {
    // Create a user with no associated opportunity to test the not-found path
    const user = await prisma.user.create({ data: { displayName: 'StandaloneUser' } })

    const result = await createEngagement(user.id, 'nonexistent-opportunity-id')

    expect(result.isErr()).toBe(true)
    expect(result._unsafeUnwrapErr()).toEqual({ code: 'OPPORTUNITY_NOT_FOUND' })
  })
})

describe('getRsvpCount', () => {
  it('returns 0 for a known opportunityId with no engagements', async () => {
    const { opportunity } = await seedAll()
    const count = await getRsvpCount(opportunity.id)
    expect(count).toBe(0)
  })

  it('returns the correct count for CONFIRMED engagements', async () => {
    const { opportunity } = await seedAll()
    const user1 = await seedExtraUser('User1')
    const user2 = await seedExtraUser('User2')

    await prisma.engagement.create({
      data: { userId: user1.id, opportunityId: opportunity.id, status: EngagementStatus.CONFIRMED },
    })
    await prisma.engagement.create({
      data: { userId: user2.id, opportunityId: opportunity.id, status: EngagementStatus.CONFIRMED },
    })

    const count = await getRsvpCount(opportunity.id)
    expect(count).toBe(2)
  })

  it('excludes CANCELED engagements from the count', async () => {
    const { opportunity } = await seedAll()
    const user1 = await seedExtraUser('UserConfirmed')
    const user2 = await seedExtraUser('UserCanceled')

    await prisma.engagement.create({
      data: { userId: user1.id, opportunityId: opportunity.id, status: EngagementStatus.CONFIRMED },
    })
    await prisma.engagement.create({
      data: { userId: user2.id, opportunityId: opportunity.id, status: EngagementStatus.CANCELED },
    })

    const count = await getRsvpCount(opportunity.id)
    expect(count).toBe(1)
  })
})

describe('getUserEngagement', () => {
  it('returns the engagement when found', async () => {
    const { user, opportunity } = await seedAll()

    await prisma.engagement.create({
      data: { userId: user.id, opportunityId: opportunity.id, status: EngagementStatus.CONFIRMED },
    })

    const engagement = await getUserEngagement(user.id, opportunity.id)
    expect(engagement).not.toBeNull()
    expect(engagement?.userId).toBe(user.id)
    expect(engagement?.opportunityId).toBe(opportunity.id)
  })

  it('returns null when no engagement exists', async () => {
    const { user, opportunity } = await seedAll()

    const engagement = await getUserEngagement(user.id, opportunity.id)
    expect(engagement).toBeNull()
  })
})

describe('getDefaultOpportunity', () => {
  it('returns the opportunity for a valid turnoutId', async () => {
    const { turnout, opportunity } = await seedAll()

    const result = await getDefaultOpportunity(turnout.id)
    expect(result).not.toBeNull()
    expect(result?.id).toBe(opportunity.id)
    expect(result?.name).toBe('Show Up')
  })

  it('returns null for an unknown turnoutId', async () => {
    const result = await getDefaultOpportunity('nonexistent-turnout-id')
    expect(result).toBeNull()
  })
})
