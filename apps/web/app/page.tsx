import Link from 'next/link'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/auth/sessions'
import { TestForm } from './test-form'
import { AuthSection } from './auth-section'
import { TopNav } from './components/organisms/top-nav'

// page queries live DB — must render at request time, not build time
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [userCount, user] = await Promise.all([
    prisma.user.count(),
    getUser(),
  ])

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav user={user} />
      <main className="flex flex-1 flex-col items-center justify-center p-24 gap-8">
      <h1 className="text-4xl font-bold">Hello Turnout</h1>
      <p>Bootstrap successful!</p>

      <AuthSection user={user} />

      {/* Start a turnout CTA — terracotta fill per branding spec */}
      <Link
        href="/organize"
        className="inline-block px-6 py-3 bg-terracotta text-white rounded-lg font-semibold text-base font-sans hover:bg-terracotta/90 transition-colors"
      >
        Start a turnout
      </Link>

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
    </div>
  )
}
