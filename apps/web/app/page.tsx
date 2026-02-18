import { prisma } from '@/lib/db'
import { TestForm } from './test-form'

// page queries live DB — must render at request time, not build time
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  // Fetch current user count on page load
  const userCount = await prisma.user.count()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Hello Turnout</h1>
      <p className="mb-4">Bootstrap successful! 🎉</p>

      <div className="mb-8 p-4 bg-gray-100 rounded">
        <p className="text-lg">
          Database connected: <span className="font-bold">{userCount} users</span>
        </p>
        <p className="text-sm text-gray-600 mt-2">
          Server Action → Prisma → Neon DB working ✓
        </p>
      </div>

      <TestForm />
    </main>
  )
}
