import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { MapPin, Calendar, Eye, Users, Edit2 } from 'lucide-react'
import { getTurnoutBySlug, isGroupOrganizer } from '@/lib/groups'
import { getUser } from '@/lib/auth/sessions'
import { getDefaultOpportunity, getRsvpCount, getUserEngagement, formatRsvpCount } from '@/lib/engagements'
import { formatRelativeDate } from '@/lib/dates/relative'
import { fetchVenuePhotoUrl } from '@/lib/places/server'
import { VenuePhotoStrip } from '@/app/components/atoms/venue-photo-strip'
import { RsvpButton } from './rsvp-button'
import { ShareButtons } from './share-buttons'
import { TopNav } from '@/app/components/organisms/top-nav'
import { GroupPill, OrganizerPill } from '@/app/components/atoms/turnout-pills'
import { PageLayout } from '@/app/components/templates/page-layout'
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

function getDirectionsHref(lat: number | null, lng: number | null, formattedAddress: string | null | undefined): string | null {
  if (lat !== null && lng !== null) return `https://maps.google.com/maps?q=${lat},${lng}`
  if (formattedAddress) return `https://maps.google.com/maps?q=${encodeURIComponent(formattedAddress)}`
  return null
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
  const directionsHref = getDirectionsHref(primaryLocation.lat, primaryLocation.lng, primaryLocation.formattedAddress)

  const organizerName = turnout.createdByUser?.displayName ?? null
  const inviteMessage = `${turnout.group.name} is organizing ${turnout.title} on ${relativeDate}. Join us: ${turnoutUrl}`
  const diffDays = Math.max(0, Math.ceil((turnout.startsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
  const daysLabel = diffDays === 0 ? 'today' : diffDays === 1 ? '1 day to go' : `${diffDays} days to go`

  return (
    <PageLayout
      topNav={isOrganizer
        ? <TopNav variant="authed" backLabel={turnout.group.name} backHref="/organize" displayName={user!.displayName ?? '??'} />
        : <TopNav variant="public" user={user} />
      }
      bottomBar={isOrganizer ? (
        <>
          <div className="px-4 py-2 bg-warm border-t border-separator">
            <ShareButtons inviteMessage={inviteMessage} turnoutUrl={turnoutUrl} turnoutTitle={turnout.title} />
          </div>
          <div className="flex border-t border-separator bg-white">
            <div className="flex-1 flex flex-col items-center justify-center py-3 gap-1">
              <Eye size={20} strokeWidth={2} className="text-sage" aria-hidden="true" />
              <span className="text-xs font-medium text-sage">Preview</span>
            </div>
            <Link href={`/organize/t/${turnout.slug}/rsvps`} className="flex-1 flex flex-col items-center justify-center py-3 gap-1 text-muted hover:text-charcoal transition-colors">
              <Users size={20} strokeWidth={2} aria-hidden="true" />
              <span className="text-xs font-medium">RSVPs</span>
            </Link>
            <div className="flex-1 flex flex-col items-center justify-center py-3 gap-1 opacity-40 cursor-not-allowed">
              <Edit2 size={20} strokeWidth={2} aria-hidden="true" />
              <span className="text-xs font-medium text-muted">Edit</span>
            </div>
          </div>
        </>
      ) : (
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
      )}
    >
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
      {isOrganizer ? (
        <div className="rounded-xl border border-sage/30 bg-[#F5F5F8] px-4 py-3 flex flex-col gap-1" data-testid="organizer-status-card">
          <div className="flex items-center gap-2 text-sage font-semibold text-base">
            <span>You&apos;re organizing this.</span>
          </div>
          <p className="text-sm text-muted">
            {rsvpCount !== null ? `${rsvpCount} RSVPs` : '–'} · {daysLabel} — share the link!
          </p>
        </div>
      ) : (
        rsvpCount !== null && (
          <div className="flex items-center gap-2 text-muted text-sm" data-testid="rsvp-count">
            <Users size={16} strokeWidth={2} aria-hidden="true" />
            {formatRsvpCount(rsvpCount)}
          </div>
        )
      )}
    </PageLayout>
  )
}
