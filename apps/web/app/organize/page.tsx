import { getUser } from '@/lib/auth/sessions'
import { OrganizeForm } from './components/organize-form'

// Page fetches user at request time — can't be static
export const dynamic = 'force-dynamic'

export default async function OrganizePage() {
  const user = await getUser()

  // The wizard owns its own full-screen layout.
  // No wrapper, no heading — it's all in OrganizeForm.
  return <OrganizeForm user={user} />
}
