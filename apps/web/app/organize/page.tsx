import { Suspense } from 'react'
import { getUser } from '@/lib/auth/sessions'
import { OrganizeForm } from './components/organize-form'

// Page fetches user at request time — can't be static
export const dynamic = 'force-dynamic'

export default async function OrganizePage() {
  const user = await getUser()

  // Suspense boundary is required by Next.js when a client component inside
  // uses useSearchParams() — without it, the build will warn and the server
  // render will bail out to the entire page being client-rendered.
  return (
    <Suspense fallback={null}>
      <OrganizeForm user={user} />
    </Suspense>
  )
}
