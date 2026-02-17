import { describe, it, expect } from 'vitest'
import { prisma } from './index'

describe('Database Connection', () => {
  it('can connect to Postgres and run queries', async () => {
    // Smoke test: if Prisma can count rows, the whole chain works
    // (schema deployed, client generated, connection string valid)
    const count = await prisma.user.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  it('can create and query a user', async () => {
    // Use timestamp to avoid unique constraint collisions across test runs
    const phoneNumber = `+1555${Date.now()}`

    const user = await prisma.user.create({
      data: { phoneNumber },
    })

    expect(user.id).toBeTruthy()
    expect(user.phoneNumber).toBe(phoneNumber)

    // Clean up after ourselves - don't leave test data lying around
    await prisma.user.delete({ where: { id: user.id } })
  })
})
