import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createUserWithCredential } from '@/lib/auth/users'
import { CredentialType } from '@prisma/client'

/**
 * Test-only endpoint: creates a user+credential directly in the DB
 * without going through the OTP flow. Idempotent — if the user already
 * exists for this phone, deletes and recreates cleanly.
 *
 * ONLY available when TEST_OTP_BYPASS=true. Returns 404 in production.
 */
export async function POST(request: Request) {
  if (process.env.TEST_OTP_BYPASS !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await request.json()
  const { phone, displayName } = body as { phone: string; displayName?: string }

  if (!phone) {
    return NextResponse.json({ error: 'phone is required' }, { status: 400 })
  }

  // Clean up any existing data for this phone — makes tests idempotent
  const existing = await prisma.credential.findUnique({
    where: {
      credentialType_credential: {
        credentialType: CredentialType.PHONE,
        credential: phone,
      },
    },
  })
  if (existing) {
    // Cascade delete will handle sessions too
    await prisma.user.delete({ where: { id: existing.userId } })
  }
  // Also clean up rate limits for this phone
  await prisma.phoneRateLimit.deleteMany({ where: { phone } })

  const result = await createUserWithCredential(phone, displayName)
  if (result.isErr()) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ userId: result.value.userId })
}
