import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prisma } from '@/lib/db'

// Control slug generation from tests. When the queue has values,
// generateTurnoutSlug returns them in order. When empty, falls back
// to random generation (same alphabet, same length).
const { slugQueue } = vi.hoisted(() => ({
  slugQueue: [] as string[],
}))

vi.mock('nanoid/non-secure', () => ({
  customAlphabet: () => () => {
    if (slugQueue.length > 0) {
      return slugQueue.shift()!
    }
    // Fallback: random slug matching the real alphabet and length
    const chars = '23456789abcdefghjkmnpqrstuvwxyz'
    let result = ''
    for (let i = 0; i < 8; i++) {
      result += chars[Math.floor(Math.random() * chars.length)]
    }
    return result
  },
}))

// Import AFTER mocking nanoid — vi.mock is hoisted, so groups.ts
// gets our mock when it calls customAlphabet() at module init.
import {
  generateTurnoutSlug,
  createGroupWithTurnout,
  getTurnoutBySlug,
} from './groups'

// FK-safe truncation order: children first, then parents
beforeEach(async () => {
  // Clear any leftover slug overrides from previous tests
  slugQueue.length = 0

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

// Seed a user for createGroupWithTurnout (it needs a real userId for FKs)
async function seedUser(displayName = 'TestOrganizer') {
  return prisma.user.create({ data: { displayName } })
}

const validData = {
  groupName: 'Save Willow Creek',
  mission: 'Stop the gravel mine from destroying Willow Creek',
  turnoutTitle: 'First Planning Meeting',
  description: 'Bring your ideas and your anger',
  location: {
    name: "Joe's Coffee",
    formattedAddress: '123 Main St, Anytown, USA',
    lat: 40.7128,
    lng: -74.006,
    placeId: 'ChIJOwg_06VPwokRYv534QaPC8g',
  },
  startsAt: new Date('2099-06-15T18:00:00Z'),
  timezone: 'America/New_York',
}

describe('generateTurnoutSlug', () => {
  it('returns an 8-character string from the expected alphabet', () => {
    const slug = generateTurnoutSlug()
    expect(slug).toHaveLength(8)
    expect(slug).toMatch(/^[23456789a-z]+$/)
  })

  it('generates different slugs on consecutive calls', () => {
    const slugs = new Set(Array.from({ length: 10 }, () => generateTurnoutSlug()))
    // With 30^8 possible slugs, 10 calls should never collide
    expect(slugs.size).toBe(10)
  })
})

describe('createGroupWithTurnout', () => {
  it('creates all 5 records and returns ok with IDs and slug', async () => {
    const user = await seedUser()
    const result = await createGroupWithTurnout(user.id, validData)

    expect(result.isOk()).toBe(true)
    const { groupId, turnoutId, turnoutSlug } = result._unsafeUnwrap()

    expect(groupId).toBeTruthy()
    expect(turnoutId).toBeTruthy()
    expect(turnoutSlug).toHaveLength(8)
    expect(turnoutSlug).toMatch(/^[23456789a-z]+$/)
  })

  it('creates Location with all provided fields', async () => {
    const user = await seedUser()
    const result = await createGroupWithTurnout(user.id, validData)
    const { turnoutId } = result._unsafeUnwrap()

    const turnout = await prisma.turnout.findUnique({
      where: { id: turnoutId },
      include: { primaryLocation: true },
    })
    expect(turnout?.primaryLocation.name).toBe("Joe's Coffee")
    expect(turnout?.primaryLocation.formattedAddress).toBe('123 Main St, Anytown, USA')
    expect(turnout?.primaryLocation.lat).toBe(40.7128)
    expect(turnout?.primaryLocation.lng).toBe(-74.006)
    expect(turnout?.primaryLocation.placeId).toBe('ChIJOwg_06VPwokRYv534QaPC8g')
  })

  it('creates Group with name and mission', async () => {
    const user = await seedUser()
    const result = await createGroupWithTurnout(user.id, validData)
    const { groupId } = result._unsafeUnwrap()

    const group = await prisma.group.findUnique({ where: { id: groupId } })
    expect(group?.name).toBe('Save Willow Creek')
    expect(group?.mission).toBe('Stop the gravel mine from destroying Willow Creek')
  })

  it('links userId to Group via GroupOrganizer compound PK', async () => {
    const user = await seedUser()
    const result = await createGroupWithTurnout(user.id, validData)
    const { groupId } = result._unsafeUnwrap()

    const organizer = await prisma.groupOrganizer.findUnique({
      where: { groupId_userId: { groupId, userId: user.id } },
    })
    expect(organizer).not.toBeNull()
    expect(organizer?.groupId).toBe(groupId)
    expect(organizer?.userId).toBe(user.id)
  })

  it('sets Turnout.createdByUserId to the provided userId', async () => {
    const user = await seedUser()
    const result = await createGroupWithTurnout(user.id, validData)
    const { turnoutId } = result._unsafeUnwrap()

    const turnout = await prisma.turnout.findUnique({ where: { id: turnoutId } })
    expect(turnout?.createdByUserId).toBe(user.id)
  })

  it('creates default Opportunity with name "Show Up" and null overrides', async () => {
    const user = await seedUser()
    const result = await createGroupWithTurnout(user.id, validData)
    const { turnoutId } = result._unsafeUnwrap()

    const opportunities = await prisma.opportunity.findMany({
      where: { turnoutId },
    })
    expect(opportunities).toHaveLength(1)
    expect(opportunities[0].name).toBe('Show Up')
    expect(opportunities[0].meetingLocationId).toBeNull()
    expect(opportunities[0].meetingTime).toBeNull()
    expect(opportunities[0].capacity).toBeNull()
  })

  it('rolls back all records if the transaction fails mid-way', async () => {
    // Count records before
    const locationsBefore = await prisma.location.count()
    const groupsBefore = await prisma.group.count()

    // Force a failure by using a userId that doesn't exist — the
    // GroupOrganizer FK to User will fail inside the transaction
    const result = await createGroupWithTurnout('nonexistent-user-id', validData)

    expect(result.isErr()).toBe(true)

    // Verify nothing leaked — transaction should have rolled back
    const locationsAfter = await prisma.location.count()
    const groupsAfter = await prisma.group.count()
    expect(locationsAfter).toBe(locationsBefore)
    expect(groupsAfter).toBe(groupsBefore)
  })

  it('retries on slug collision and succeeds on second attempt', async () => {
    const user = await seedUser()

    // First turnout: force a known slug so we can collide with it
    slugQueue.push('abcd2345')
    const firstResult = await createGroupWithTurnout(user.id, validData)
    expect(firstResult.isOk()).toBe(true)
    expect(firstResult._unsafeUnwrap().turnoutSlug).toBe('abcd2345')

    // Second turnout: first attempt returns the colliding slug,
    // second attempt returns a fresh one — the retry logic should
    // catch the P2002 and try again
    slugQueue.push('abcd2345', 'wxyz6789')
    const secondResult = await createGroupWithTurnout(user.id, {
      ...validData,
      groupName: 'Second Group',
    })
    expect(secondResult.isOk()).toBe(true)
    expect(secondResult._unsafeUnwrap().turnoutSlug).toBe('wxyz6789')
  })
})

describe('getTurnoutBySlug', () => {
  it('returns turnout with group and primaryLocation when found', async () => {
    const user = await seedUser()
    const result = await createGroupWithTurnout(user.id, validData)
    const { turnoutSlug } = result._unsafeUnwrap()

    const turnout = await getTurnoutBySlug(turnoutSlug)

    expect(turnout).not.toBeNull()
    expect(turnout?.slug).toBe(turnoutSlug)
    expect(turnout?.title).toBe('First Planning Meeting')
    // Verify includes
    expect(turnout?.group).toBeTruthy()
    expect(turnout?.group.name).toBe('Save Willow Creek')
    expect(turnout?.primaryLocation).toBeTruthy()
    expect(turnout?.primaryLocation.name).toBe("Joe's Coffee")
  })

  it('returns null when slug does not exist', async () => {
    const turnout = await getTurnoutBySlug('nonexistent')
    expect(turnout).toBeNull()
  })
})
