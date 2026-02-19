import { prisma } from '@/lib/db'
import { getUser } from '@/lib/auth/sessions'
import { TestForm } from './test-form'
import { AuthSection } from './auth-section'

// page queries live DB — must render at request time, not build time
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [userCount, user] = await Promise.all([
    prisma.user.count(),
    getUser(),
  ])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 gap-8">
      <h1 className="text-4xl font-bold">Hello Turnout</h1>
      <p>Bootstrap successful!</p>

      <AuthSection user={user} />

      <div className="p-4 bg-gray-100 rounded">
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
