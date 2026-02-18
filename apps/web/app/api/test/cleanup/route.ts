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
  if (process.env.TEST_OTP_BYPASS !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await request.json()
  const { phones } = body as { phones: string[] }

  if (!phones?.length) {
    return NextResponse.json({ error: 'phones array is required' }, { status: 400 })
  }

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

  return NextResponse.json({ cleaned: phones.length })
}
