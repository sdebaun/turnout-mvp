import { prisma } from '@/lib/db'

// Proof-of-life cron handler: just queries the database and reports back.
// Runs hourly via EventBridge once deployed. The real cron jobs (reminders,
// cleanup) will replace this in later TDDs.
export async function handler() {
  console.log('Hello from cron! Timestamp:', new Date().toISOString())

  const userCount = await prisma.user.count()
  console.log('User count:', userCount)

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Cron executed successfully',
      userCount,
      timestamp: new Date().toISOString()
    })
  }
}
