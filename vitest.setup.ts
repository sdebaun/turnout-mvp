import { beforeAll, afterAll } from 'vitest'

// SST injects secrets as JSON blobs (SST_RESOURCE_DatabaseUrl={"type":"...","value":"postgresql://..."}).
// Prisma reads DATABASE_URL at module load time, so we must extract it here — at the top level,
// before any test file imports the Prisma client.
if (process.env.SST_RESOURCE_DatabaseUrl && !process.env.DATABASE_URL) {
  const resource = JSON.parse(process.env.SST_RESOURCE_DatabaseUrl) as { value: string }
  process.env.DATABASE_URL = resource.value
}

beforeAll(async () => {
  console.log('Test setup: checking database connection')
})

afterAll(async () => {
  console.log('Test cleanup: disconnecting from database')
})
