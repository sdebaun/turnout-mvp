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
    const user = await prisma.user.create({
      data: { displayName: 'DbTestUser' },
    })

    expect(user.id).toBeTruthy()
    expect(user.displayName).toBe('DbTestUser')

    // Clean up after ourselves - don't leave test data lying around
    await prisma.user.delete({ where: { id: user.id } })
  })
})
