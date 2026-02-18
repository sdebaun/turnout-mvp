import { ResultAsync } from 'neverthrow'
import { prisma } from '@/lib/db'
import crypto from 'crypto'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'session_token'

/**
 * Create a new session for a user. Generates a cryptographically random
 * 64-char hex token, stores it in the DB, returns the raw token so the
 * caller can stuff it into a cookie.
 */
export function createSession(
  userId: string,
  userAgent?: string,
  ipAddress?: string
): ResultAsync<string, string> {
  const token = crypto.randomBytes(32).toString('hex')

  return ResultAsync.fromPromise(
    prisma.session.create({
      data: { userId, token, userAgent, ipAddress },
    }),
    (e) => `Database error creating session: ${(e as Error).message}`
  ).map(() => token)
}

/**
 * Delete a session by token. Used during logout.
 * Silently succeeds if the token doesn't exist (idempotent).
 */
export function deleteSession(
  token: string
): ResultAsync<void, string> {
  return ResultAsync.fromPromise(
    prisma.session.deleteMany({ where: { token } }).then(() => undefined),
    (e) => `Database error deleting session: ${(e as Error).message}`
  )
}

/**
 * Set the session cookie. HttpOnly + Secure (prod) + SameSite=Lax.
 * No expiration — persistent sessions per PRD.
 */
export function setSessionCookie(token: string): void {
  const cookieStore = cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })
}

/**
 * Clear the session cookie on logout.
 */
export function clearSessionCookie(): void {
  const cookieStore = cookies()
  cookieStore.delete(COOKIE_NAME)
}

/**
 * Read the session cookie → look up user in DB.
 * Returns null if no cookie, invalid token, or no matching session.
 * This is the function Server Components call to get the current user.
 */
export async function getUser() {
  const cookieStore = cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (!token) return null

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  })

  return session?.user ?? null
}
