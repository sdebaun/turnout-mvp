import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prisma } from '@/lib/db'
import { CredentialType } from '@prisma/client'

// Mock next/headers — Server Component cookies() API doesn't exist in vitest
const mockCookieStore = new Map<string, { value: string }>()
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (name: string) => mockCookieStore.get(name) ?? undefined,
    set: (name: string, value: string, _opts?: unknown) => {
      mockCookieStore.set(name, { value })
    },
    delete: (name: string) => {
      mockCookieStore.delete(name)
    },
  }),
}))

// Import AFTER mocking
import { createSession, deleteSession, setSessionCookie, clearSessionCookie, getUser } from './sessions'

beforeEach(async () => {
  await prisma.session.deleteMany()
  await prisma.credential.deleteMany()
  await prisma.user.deleteMany()
  await prisma.phoneRateLimit.deleteMany()
  mockCookieStore.clear()
})

describe('createSession', () => {
  it('creates a Session record and returns a 64-char hex token', async () => {
    const user = await prisma.user.create({
      data: { displayName: 'SessionTest' },
    })

    const result = await createSession(user.id)
    expect(result.isOk()).toBe(true)

    const token = result._unsafeUnwrap()
    expect(token).toHaveLength(64)
    expect(token).toMatch(/^[0-9a-f]{64}$/)

    // Verify DB record exists
    const session = await prisma.session.findUnique({ where: { token } })
    expect(session).not.toBeNull()
    expect(session?.userId).toBe(user.id)
  })
})

describe('deleteSession', () => {
  it('removes the Session record by token', async () => {
    const user = await prisma.user.create({
      data: { displayName: 'DeleteTest' },
    })
    const result = await createSession(user.id)
    const token = result._unsafeUnwrap()

    // Session should exist
    expect(await prisma.session.findUnique({ where: { token } })).not.toBeNull()

    const deleteResult = await deleteSession(token)
    expect(deleteResult.isOk()).toBe(true)

    // Session should be gone
    expect(await prisma.session.findUnique({ where: { token } })).toBeNull()
  })
})

describe('getUser', () => {
  it('returns null for an unrecognized token', async () => {
    mockCookieStore.set('session_token', { value: 'nonexistent_token_abc123' })
    const user = await getUser()
    expect(user).toBeNull()
  })

  it('returns null when no cookie is present', async () => {
    const user = await getUser()
    expect(user).toBeNull()
  })

  it('returns the associated User for a valid session token', async () => {
    const dbUser = await prisma.user.create({
      data: { displayName: 'GetUserTest' },
    })
    const result = await createSession(dbUser.id)
    const token = result._unsafeUnwrap()

    // Simulate having the cookie
    mockCookieStore.set('session_token', { value: token })

    const user = await getUser()
    expect(user).not.toBeNull()
    expect(user?.id).toBe(dbUser.id)
    expect(user?.displayName).toBe('GetUserTest')
  })
})

describe('setSessionCookie / clearSessionCookie', () => {
  it('sets and clears the session cookie', () => {
    setSessionCookie('test_token_value')
    expect(mockCookieStore.get('session_token')?.value).toBe('test_token_value')

    clearSessionCookie()
    expect(mockCookieStore.has('session_token')).toBe(false)
  })
})
