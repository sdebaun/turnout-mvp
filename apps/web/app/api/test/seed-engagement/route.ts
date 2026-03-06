import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * Test-only endpoint: creates a CONFIRMED engagement for a given userId + turnout slug.
 * Used by E2E tests that need to pre-seed an RSVP without going through the UI flow.
 *
 * ONLY available when TEST_OTP_BYPASS=true. Returns 404 otherwise.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production' || process.env.TEST_OTP_BYPASS !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await request.json()
  const { userId, turnoutSlug } = body as { userId: string; turnoutSlug: string }

  if (!userId || !turnoutSlug) {
    return NextResponse.json({ error: 'userId and turnoutSlug are required' }, { status: 400 })
  }

  // Find the default opportunity for this turnout
  const turnout = await prisma.turnout.findUnique({
    where: { slug: turnoutSlug },
    include: { opportunities: { take: 1 } },
  })

  if (!turnout) {
    return NextResponse.json({ error: 'Turnout not found' }, { status: 404 })
  }

  const opportunity = turnout.opportunities[0]
  if (!opportunity) {
    return NextResponse.json({ error: 'No opportunity found for this turnout' }, { status: 404 })
  }

  // Upsert — idempotent so tests can call this multiple times safely
  const engagement = await prisma.engagement.upsert({
    where: { userId_opportunityId: { userId, opportunityId: opportunity.id } },
    create: {
      userId,
      opportunityId: opportunity.id,
      status: 'CONFIRMED',
    },
    update: {
      status: 'CONFIRMED',
      canceledAt: null,
      confirmedAt: new Date(),
    },
  })

  return NextResponse.json({ engagementId: engagement.id })
}
