import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createGroupWithTurnout } from '@/lib/groups'
import { Session } from '@prisma/client'

/**
 * Test-only endpoint: creates a group + turnout for a given session token.
 * Used by E2E tests that need a real turnout without running the full wizard UI.
 *
 * ONLY available when TEST_OTP_BYPASS=true. Returns 404 in production.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await request.json()
  const { sessionToken, groupName, mission, turnoutTitle, location, startsAt } = body as {
    sessionToken: string
    groupName: string
    mission: string
    turnoutTitle: string
    location: string
    startsAt: string
  }

  if (!sessionToken || !groupName || !turnoutTitle || !startsAt) {
    return NextResponse.json({ error: 'sessionToken, groupName, turnoutTitle, startsAt are required' }, { status: 400 })
  }

  // Look up the session to get the userId
  const session = await prisma.session.findUnique({ where: { token: sessionToken } })
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const result = await createGroupWithTurnout(session.userId, {
    groupName,
    mission: mission ?? groupName,
    turnoutTitle,
    location: {
      name: location ?? 'Test Location',
      formattedAddress: location ?? 'Test Location, Ventura CA',
    },
    startsAt: new Date(startsAt),
  })

  if (result.isErr()) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ slug: result.value.turnoutSlug, groupId: result.value.groupId })
}
