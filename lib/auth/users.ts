import { ResultAsync, okAsync, errAsync } from 'neverthrow'
import { prisma } from '@/lib/db'
import { CredentialType } from '@prisma/client'
import {
  uniqueNamesGenerator,
  adjectives,
  animals,
} from 'unique-names-generator'

/**
 * Check if a phone number already has a credential in the system.
 * Returns isNewUser: true if no credential exists — the caller decides
 * what to do with that information.
 */
export function checkPhoneExists(
  phone: string
): ResultAsync<{ isNewUser: boolean }, string> {
  return ResultAsync.fromPromise(
    prisma.credential.findUnique({
      where: {
        credentialType_credential: {
          credentialType: CredentialType.PHONE,
          credential: phone,
        },
      },
    }),
    (e) => `Database error checking phone: ${(e as Error).message}`
  ).map((credential) => ({ isNewUser: !credential }))
}

/**
 * Create a User + Credential in a single atomic transaction.
 * If displayName is omitted, generates a random one (e.g., "OrangeArmadillo").
 * The invariant is that User and Credential are always born together — never orphaned.
 */
export function createUserWithCredential(
  phone: string,
  displayName?: string
): ResultAsync<{ userId: string }, string> {
  const name =
    displayName ||
    uniqueNamesGenerator({
      dictionaries: [adjectives, animals],
      separator: '',
      style: 'capital',
    })

  return ResultAsync.fromPromise(
    prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          displayName: name,
          credentials: {
            create: {
              credentialType: CredentialType.PHONE,
              credential: phone,
            },
          },
        },
      })
      return { userId: user.id }
    }),
    (e) => `Database error creating user: ${(e as Error).message}`
  )
}

/**
 * Look up a credential by phone. Returns null if not found —
 * null is an expected state (new user), not an error.
 */
export async function getCredentialByPhone(phone: string) {
  return prisma.credential.findUnique({
    where: {
      credentialType_credential: {
        credentialType: CredentialType.PHONE,
        credential: phone,
      },
    },
  })
}
