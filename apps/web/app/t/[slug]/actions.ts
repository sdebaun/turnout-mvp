'use server'

import { getUser } from '@/lib/auth/sessions'
import { getTurnoutBySlug } from '@/lib/groups'
import { createEngagement, getDefaultOpportunity } from '@/lib/engagements'

export async function rsvpAction(slug: string): Promise<{ success: true } | { error: string }> {
  const user = await getUser()
  if (!user) return { error: 'Not authenticated' }

  const turnout = await getTurnoutBySlug(slug)
  if (!turnout) return { error: 'Turnout not found' }

  const opportunity = await getDefaultOpportunity(turnout.id)
  if (!opportunity) return { error: 'No opportunity found' }

  const result = await createEngagement(user.id, opportunity.id)
  if (result.isErr()) {
    const err = result.error
    if (err.code === 'ALREADY_RSVPD') return { error: "You're already going to this one." }
    return { error: 'Something went wrong. Please try again.' }
  }

  return { success: true }
}
