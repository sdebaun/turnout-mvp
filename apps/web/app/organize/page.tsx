import { getUser } from '@/lib/auth/sessions'
import { OrganizeForm } from './components/organize-form'

// Page fetches user at request time — can't be static
export const dynamic = 'force-dynamic'

export default async function OrganizePage() {
  const user = await getUser()

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Let&apos;s get people moving.
        </h1>
        <p className="text-gray-600">
          Don&apos;t think too hard about this — you can change everything later.
        </p>
      </div>

      <OrganizeForm user={user} />
    </main>
  )
}
