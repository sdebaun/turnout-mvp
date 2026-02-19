import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { checkPhoneExists, createUserWithCredential, getCredentialByPhone } from './users'
import { CredentialType } from '@prisma/client'

// Clean slate before each test — FK order matters
beforeEach(async () => {
  await prisma.session.deleteMany()
  await prisma.credential.deleteMany()
  await prisma.user.deleteMany()
  await prisma.phoneRateLimit.deleteMany()
})

describe('checkPhoneExists', () => {
  it('returns isNewUser: true for an unknown phone', async () => {
    const result = await checkPhoneExists('+15555550100')
    expect(result.isOk()).toBe(true)
    expect(result._unsafeUnwrap()).toEqual({ isNewUser: true })
  })

  it('returns isNewUser: false for a phone with existing credential', async () => {
    // Seed a user + credential
    await prisma.user.create({
      data: {
        displayName: 'TestUser',
        credentials: {
          create: {
            credentialType: CredentialType.PHONE,
            credential: '+15555550101',
          },
        },
      },
    })

    const result = await checkPhoneExists('+15555550101')
    expect(result.isOk()).toBe(true)
    expect(result._unsafeUnwrap()).toEqual({ isNewUser: false })
  })
})

describe('createUserWithCredential', () => {
  it('creates User + Credential in a transaction and returns userId', async () => {
    const result = await createUserWithCredential('+15555550102', 'AliceWombat')
    expect(result.isOk()).toBe(true)

    const { userId } = result._unsafeUnwrap()
    expect(userId).toBeTruthy()

    // Verify both records exist
    const user = await prisma.user.findUnique({ where: { id: userId } })
    expect(user?.displayName).toBe('AliceWombat')

    const cred = await prisma.credential.findFirst({ where: { userId } })
    expect(cred?.credential).toBe('+15555550102')
    expect(cred?.credentialType).toBe(CredentialType.PHONE)
  })

  it('uses provided displayName when given', async () => {
    const result = await createUserWithCredential('+15555550103', 'BobBuilder')
    const { userId } = result._unsafeUnwrap()

    const user = await prisma.user.findUnique({ where: { id: userId } })
    expect(user?.displayName).toBe('BobBuilder')
  })

  it('generates a random display name when displayName is omitted', async () => {
    const result = await createUserWithCredential('+15555550104')
    const { userId } = result._unsafeUnwrap()

    const user = await prisma.user.findUnique({ where: { id: userId } })
    // Random names from unique-names-generator are non-empty strings
    expect(user?.displayName).toBeTruthy()
    expect(user!.displayName.length).toBeGreaterThan(0)
  })

  it('returns err on duplicate phone credential', async () => {
    await createUserWithCredential('+15555550105', 'First')
    const result = await createUserWithCredential('+15555550105', 'Second')

    // Should fail due to unique constraint on (credentialType, credential)
    expect(result.isErr()).toBe(true)
  })
})

describe('getCredentialByPhone', () => {
  it('returns the Credential record for a known phone', async () => {
    await prisma.user.create({
      data: {
        displayName: 'TestUser',
        credentials: {
          create: {
            credentialType: CredentialType.PHONE,
            credential: '+15555550106',
          },
        },
      },
    })

    const cred = await getCredentialByPhone('+15555550106')
    expect(cred).not.toBeNull()
    expect(cred?.credential).toBe('+15555550106')
  })

  it('returns null for an unknown phone', async () => {
    const cred = await getCredentialByPhone('+15555559999')
    expect(cred).toBeNull()
  })
})
