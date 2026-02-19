import { PrismaClient } from '@prisma/client'

// SST injects secrets as JSON blobs (SST_RESOURCE_DatabaseUrl={"type":"...","value":"postgresql://..."}).
// Prisma requires DATABASE_URL as a plain env var. Parse it here — at module load time, before
// PrismaClient initializes — so this works in Lambda, Next.js dev, and test environments alike.
if (process.env.SST_RESOURCE_DatabaseUrl && !process.env.DATABASE_URL) {
  const resource = JSON.parse(process.env.SST_RESOURCE_DatabaseUrl) as { value: string }
  process.env.DATABASE_URL = resource.value
}

// Singleton pattern prevents "too many connections" during dev hot reloads.
// In production each Lambda cold start gets its own instance anyway.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
