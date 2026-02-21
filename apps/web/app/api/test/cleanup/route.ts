import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { CredentialType } from '@prisma/client'

/**
 * Test-only endpoint: cleans up user data for given phone numbers.
 * Makes E2E tests idempotent — previous run data won't interfere.
 *
 * ONLY available when TEST_OTP_BYPASS=true. Returns 404 in production.
 */
export async function POST(request: Request) {
  if (process.env.TEST_OTP_BYPASS !== 'true' || process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await request.json()
  const { phones, slugs } = body as { phones?: string[]; slugs?: string[] }

  if (!phones?.length && !slugs?.length) {
    return NextResponse.json({ error: 'phones and/or slugs array is required' }, { status: 400 })
  }

  let phonesDeleted = 0
  let slugsDeleted = 0

  // Clean up user data by phone number (existing behavior)
  if (phones?.length) {
    for (const phone of phones) {
      // Find and delete user via credential — use try/catch because
      // parallel test workers may race on the same cleanup
      const cred = await prisma.credential.findUnique({
        where: {
          credentialType_credential: {
            credentialType: CredentialType.PHONE,
            credential: phone,
          },
        },
      })
      if (cred) {
        try {
          await prisma.user.delete({ where: { id: cred.userId } })
        } catch {
          // Already deleted by another parallel test — that's fine
        }
      }
      // Clean up rate limits regardless
      await prisma.phoneRateLimit.deleteMany({ where: { phone } })
    }
    phonesDeleted = phones.length
  }

  // Clean up turnout/group/location data by turnout slug
  if (slugs?.length) {
    for (const slug of slugs) {
      const turnout = await prisma.turnout.findUnique({
        where: { slug },
        include: { group: true, primaryLocation: true },
      })
      if (turnout) {
        try {
          // Delete all turnouts in this group (cascades to Opportunities)
          await prisma.turnout.deleteMany({ where: { groupId: turnout.groupId } })
          // Delete the group (cascades to GroupOrganizer)
          await prisma.group.delete({ where: { id: turnout.groupId } })
          // Delete the location (not cascade-linked, must be explicit)
          await prisma.location.delete({ where: { id: turnout.primaryLocationId } })
        } catch {
          // Already deleted by another parallel test — that's fine
        }
      }
    }
    slugsDeleted = slugs.length
  }

  return NextResponse.json({ cleaned: { phones: phonesDeleted, slugs: slugsDeleted } })
}
