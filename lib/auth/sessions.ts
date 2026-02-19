import { ResultAsync } from 'neverthrow'
import { prisma } from '@/lib/db'
import type { User } from '@prisma/client'
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
 * Read the raw session token from the cookie without loading the user.
 * Exported so callers (e.g. logoutAction) can get the token to call
 * deleteSession() without needing to know the cookie name themselves.
 */
export function getSessionToken(): string | undefined {
  const cookieStore = cookies()
  return cookieStore.get(COOKIE_NAME)?.value
}

/**
 * Read the session cookie → look up user in DB, touching lastActiveAt.
 * Returns null if no cookie, invalid token, or no matching session.
 * This is the function Server Components call to get the current user.
 *
 * Uses update() instead of findUnique() so lastActiveAt stays meaningful —
 * one round-trip, and Prisma throws (caught below) if the token doesn't exist.
 */
export async function getUser(): Promise<User | null> {
  const cookieStore = cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (!token) return null

  try {
    const session = await prisma.session.update({
      where: { token },
      data: { lastActiveAt: new Date() },
      include: { user: true },
    })
    return session.user
  } catch {
    // Session doesn't exist or DB error — treat as unauthenticated
    return null
  }
}
