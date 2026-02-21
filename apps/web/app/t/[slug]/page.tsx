import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { getTurnoutBySlug } from '@/lib/groups'
import { getUser } from '@/lib/auth/sessions'
import { prisma } from '@/lib/db'
import { ShareButtons } from './share-buttons'

export const dynamic = 'force-dynamic'

interface TurnoutPageProps {
  params: { slug: string }
}

export default async function TurnoutPage({ params }: TurnoutPageProps) {
  const turnout = await getTurnoutBySlug(params.slug)
  if (!turnout) notFound()

  const user = await getUser()

  // Check if the viewer is an organizer of this turnout's group
  let isOrganizer = false
  if (user) {
    const organizerRecord = await prisma.groupOrganizer.findFirst({
      where: { groupId: turnout.groupId, userId: user.id },
    })
    isOrganizer = !!organizerRecord
  }

  // Build the turnout URL from the request host so it works on
  // both prod (turnout.network) and dev stages (CloudFront URLs)
  const host = headers().get('host') ?? 'turnout.network'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const turnoutUrl = `${protocol}://${host}/t/${turnout.slug}`

  const formattedDate = turnout.startsAt.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const formattedTime = turnout.startsAt.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
  const locationName = turnout.primaryLocation.name

  if (isOrganizer) {
    const inviteMessage = `Hey! I'm organizing ${turnout.title} for ${turnout.group.name} — ${formattedDate} at ${formattedTime} at ${locationName}. RSVP here: ${turnoutUrl}`

    return (
      <main className="min-h-screen py-12 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h1 className="text-2xl font-bold text-green-900 mb-2">
              Your turnout is live!
            </h1>
            <p className="text-green-700">
              Share the link and get people moving.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">{turnout.title}</h2>
            <p className="text-gray-600">{turnout.group.name} — {turnout.group.mission}</p>
            <p className="text-gray-700">
              {formattedDate} at {formattedTime}
            </p>
            <p className="text-gray-700">{locationName}</p>
          </div>

          {turnout.description && (
            <p className="text-gray-600">{turnout.description}</p>
          )}

          {/* Prewritten invite message */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Invite message:</p>
            <p className="text-gray-800 whitespace-pre-wrap" data-testid="invite-message">
              {inviteMessage}
            </p>
          </div>

          <ShareButtons
            inviteMessage={inviteMessage}
            turnoutUrl={turnoutUrl}
            turnoutTitle={turnout.title}
          />

          <p className="text-center text-gray-500 text-sm">
            0 people have RSVPd so far — share the link!
          </p>
        </div>
      </main>
    )
  }

  // Public view — everyone else
  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">{turnout.title}</h1>
          <p className="text-gray-600">{turnout.group.name}</p>
          <p className="text-gray-700">
            {formattedDate} at {formattedTime}
          </p>
          <p className="text-gray-700">{locationName}</p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <p className="text-gray-600">
            Full details coming soon. Check back before the event!
          </p>
        </div>
      </div>
    </main>
  )
}
