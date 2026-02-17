import { beforeAll, afterAll } from 'vitest'

beforeAll(async () => {
  console.log('Test setup: checking database connection')
})

afterAll(async () => {
  console.log('Test cleanup: disconnecting from database')
})
