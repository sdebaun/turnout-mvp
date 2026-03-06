import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { MapPin, Calendar } from 'lucide-react'
import { getTurnoutBySlug, isGroupOrganizer } from '@/lib/groups'
import { getUser } from '@/lib/auth/sessions'
import { getDefaultOpportunity, getRsvpCount, getUserEngagement, formatRsvpCount } from '@/lib/engagements'
import { formatRelativeDate } from '@/lib/dates/relative'
import { fetchVenuePhotoUrl } from '@/lib/places/server'
import { VenuePhotoStrip } from '@/app/components/venue-photo-strip'
import { RsvpButton } from './rsvp-button'
import { ShareButtons } from './share-buttons'
import { TopNav } from '@/app/components/top-nav'
import { GroupPill, OrganizerPill } from '@/app/components/turnout-pills'
import Link from 'next/link'

function TurnoutInfo({ title, relativeDate, locationLabel, directionsHref, description }: {
  title: string
  relativeDate: string
  locationLabel: string
  directionsHref: string | null
  description: string | null
}) {
  return (
    <>
      <h1 className="font-heading font-bold text-3xl text-charcoal leading-tight">{title}</h1>

      {/* When */}
      <div className="flex items-center gap-2 text-charcoal">
        <Calendar size={16} strokeWidth={1.75} className="text-sage flex-shrink-0" />
        <span className="text-sm font-medium">{relativeDate}</span>
      </div>

      {/* Where */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-charcoal">
          <MapPin size={16} strokeWidth={1.75} className="text-sage flex-shrink-0" />
          <span className="text-sm font-medium">{locationLabel}</span>
        </div>
        {directionsHref && (
          <a
            href={directionsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-terracotta text-sm font-medium ml-6 hover:underline"
            data-testid="directions-link"
          >
            Get Directions ↗
          </a>
        )}
      </div>

      {/* Venue photos */}
      <VenuePhotoStrip />

      {/* Description */}
      {description && (
        <p className="text-muted text-sm leading-relaxed">{description}</p>
      )}
    </>
  )
}

interface TurnoutPageProps {
  params: { slug: string }
}

export async function generateMetadata({ params }: TurnoutPageProps): Promise<Metadata> {
  const turnout = await getTurnoutBySlug(params.slug)
  if (!turnout) return {}

  const relativeDate = formatRelativeDate(turnout.startsAt)
  const description = [
    turnout.group.name,
    relativeDate,
    turnout.primaryLocation.name,
  ]
    .filter(Boolean)
    .join(' · ')

  // Venue photo for og:image — makes share links in Signal/WhatsApp substantially
  // more clickable. Fetched server-side + cached 24h. Fails silently.
  const ogImage = await fetchVenuePhotoUrl(turnout.primaryLocation.placeId)

  return {
    title: `${turnout.title} — turnout.network`,
    description,
    openGraph: {
      title: turnout.title,
      description,
      type: 'website',
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630 }] } : {}),
    },
  }
}

export default async function TurnoutPage({ params }: TurnoutPageProps) {
  const turnout = await getTurnoutBySlug(params.slug)
  if (!turnout) notFound()

  const user = await getUser()

  const isOrganizer = user ? await isGroupOrganizer(user.id, turnout.groupId) : false

  const defaultOpportunity = await getDefaultOpportunity(turnout.id)
  const existingEngagement =
    user && defaultOpportunity
      ? await getUserEngagement(user.id, defaultOpportunity.id)
      : null
  const rsvpCount = defaultOpportunity ? await getRsvpCount(defaultOpportunity.id) : null

  const relativeDate = formatRelativeDate(turnout.startsAt)

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://turnout.network'
  const turnoutUrl = `${baseUrl}/t/${turnout.slug}`

  const { primaryLocation } = turnout
  const directionsHref =
    primaryLocation.lat !== null && primaryLocation.lng !== null
      ? `https://maps.google.com/maps?q=${primaryLocation.lat},${primaryLocation.lng}`
      : primaryLocation.formattedAddress
      ? `https://maps.google.com/maps?q=${encodeURIComponent(primaryLocation.formattedAddress)}`
      : null

  const organizerName = turnout.createdByUser?.displayName ?? null

  // ─────────────────────────────────────────────────────────────────────────────
  // ORGANIZER VIEW
  // ─────────────────────────────────────────────────────────────────────────────
  if (isOrganizer) {
    const inviteMessage = `${turnout.group.name} is organizing ${turnout.title} on ${relativeDate}. Join us: ${turnoutUrl}`

    // Days until the turnout — shown in organizer status card
    const now = new Date()
    const diffMs = turnout.startsAt.getTime() - now.getTime()
    const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
    const daysLabel = diffDays === 0 ? 'today' : diffDays === 1 ? '1 day to go' : `${diffDays} days to go`

    return (
      <div className="min-h-screen flex flex-col bg-offwhite">
        <TopNav
          variant="authed"
          backLabel={turnout.group.name}
          backHref="/organize"
          displayName={user!.displayName ?? '??'}
        />

        <main className="flex-1 flex flex-col">
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-3 bg-warm">
            <div className="flex items-center gap-2 flex-wrap">
              <GroupPill name={turnout.group.name} />
              {organizerName && <OrganizerPill name={organizerName} />}
            </div>
            <TurnoutInfo
              title={turnout.title}
              relativeDate={relativeDate}
              locationLabel={primaryLocation.formattedAddress ?? primaryLocation.name}
              directionsHref={directionsHref}
              description={turnout.description}
            />

            {/* Organizer status card */}
            <div
              className="rounded-xl border border-sage/30 bg-[#F5F5F8] px-4 py-3 flex flex-col gap-1"
              data-testid="organizer-status-card"
            >
              <div className="flex items-center gap-2 text-sage font-semibold text-base">
                <span>You&apos;re organizing this.</span>
              </div>
              <p className="text-sm text-muted">
                {rsvpCount !== null ? `${rsvpCount} RSVPs` : '–'} · {daysLabel} — share the link!
              </p>
            </div>
          </div>

          {/* Share bar */}
          <div className="px-4 py-2 bg-warm border-t border-separator">
            <ShareButtons
              inviteMessage={inviteMessage}
              turnoutUrl={turnoutUrl}
              turnoutTitle={turnout.title}
            />
          </div>

          {/* Tab nav */}
          <div className="flex border-t border-separator bg-white">
            {/* Preview — active */}
            <div className="flex-1 flex flex-col items-center justify-center py-3 gap-1">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3D6B52" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <span className="text-xs font-medium text-sage">Preview</span>
            </div>

            {/* RSVPs — links to TDD0006 organizer RSVP list (page may 404 until then) */}
            <Link
              href={`/organize/t/${turnout.slug}/rsvps`}
              className="flex-1 flex flex-col items-center justify-center py-3 gap-1 text-muted hover:text-charcoal transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span className="text-xs font-medium">RSVPs</span>
            </Link>

            {/* Edit — post-MVP, disabled */}
            <div className="flex-1 flex flex-col items-center justify-center py-3 gap-1 opacity-40 cursor-not-allowed">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              <span className="text-xs font-medium text-muted">Edit</span>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC VIEW (participants + unauthenticated)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-offwhite">
      <TopNav variant="public" user={user} />

      <main className="flex-1 flex flex-col">
        {/* Scrollable content area */}
        <div className="flex-1 px-4 py-5 flex flex-col gap-3 bg-warm">
          <div className="flex items-center gap-2 flex-wrap">
            <GroupPill name={turnout.group.name} />
            {organizerName && <OrganizerPill name={organizerName} />}
          </div>
          <TurnoutInfo
            title={turnout.title}
            relativeDate={relativeDate}
            locationLabel={primaryLocation.formattedAddress ?? primaryLocation.name}
            directionsHref={directionsHref}
            placeId={primaryLocation.placeId}
            description={turnout.description}
          />

          {/* RSVP count — only shown when we have a reliable count (null = DB error, hide it) */}
          {rsvpCount !== null && (
            <div className="flex items-center gap-2 text-muted text-sm" data-testid="rsvp-count">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              {formatRsvpCount(rsvpCount)}
            </div>
          )}
        </div>

        {/* Sticky bottom bar with RSVP button */}
        <div className="px-4 py-2 bg-offwhite border-t border-separator">
          <RsvpButton
            slug={turnout.slug}
            isAuthenticated={!!user}
            initialEngagement={existingEngagement ? { status: existingEngagement.status } : null}
            lat={primaryLocation.lat ?? null}
            lng={primaryLocation.lng ?? null}
            formattedAddress={primaryLocation.formattedAddress ?? null}
          />
        </div>
      </main>
    </div>
  )
}
