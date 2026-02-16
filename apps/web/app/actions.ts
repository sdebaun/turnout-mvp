'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function incrementCounter(): Promise<void> {
  // Prove the Server Action -> Prisma pipeline works end-to-end
  const userCount = await prisma.user.count()
  console.log(`Server Action called. User count: ${userCount}`)

  revalidatePath('/')
}
