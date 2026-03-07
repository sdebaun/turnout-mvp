'use client'

import type { EngagementStatus } from '@prisma/client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { rsvpAction } from './actions'
import { AuthModal } from '@/app/auth/components/auth-modal'
import { CalendarIcon, MapPinIcon } from '@/app/components/atoms/icons'

interface RsvpButtonProps {
  slug: string
  isAuthenticated: boolean
  initialEngagement: { status: EngagementStatus } | null
  lat: number | null
  lng: number | null
  formattedAddress: string | null
}

type RsvpState = 'idle' | 'loading' | 'confirmed' | 'error'

export function RsvpButton({
  slug,
  isAuthenticated,
  initialEngagement,
  lat,
  lng,
  formattedAddress,
}: RsvpButtonProps) {
  const router = useRouter()

  // If already RSVP'd, start in confirmed state — returning users see "You're going!" on load
  const [state, setState] = useState<RsvpState>(
    initialEngagement?.status === 'CONFIRMED' ? 'confirmed' : 'idle'
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)

  // Build directions link from coordinates (preferred) or address fallback.
  // lat/lng should always be present for Places-sourced locations (TDD0002 enforced it)
  // but we guard anyway because nullable is in the schema.
  const directionsHref =
    lat !== null && lng !== null
      ? `https://maps.google.com/maps?q=${lat},${lng}`
      : formattedAddress
      ? `https://maps.google.com/maps?q=${encodeURIComponent(formattedAddress)}`
      : null

  async function doRsvp() {
    setState('loading')
    const result = await rsvpAction(slug)
    if ('success' in result) {
      setState('confirmed')
      // Refresh server component data so the RSVP count updates.
      // Client state is already confirmed so there's no flicker.
      router.refresh()
    } else {
      setState('error')
      setErrorMessage(result.error)
    }
  }

  function handleRsvpClick() {
    if (!isAuthenticated) {
      // Gate unauthenticated users through the auth modal first —
      // once auth completes, onSuccess fires doRsvp automatically
      setShowAuthModal(true)
    } else {
      doRsvp()
    }
  }

  if (state === 'confirmed') {
    return (
      <div className="flex flex-col gap-3">
        {/* Confirmation card */}
        <div className="rounded-xl border border-sage/30 bg-[#F5F5F8] px-4 py-3">
          <div className="flex items-center gap-2 text-sage font-semibold text-base">
            <span>You&apos;re going!</span>
          </div>
          <p className="text-sm text-muted mt-0.5">We&apos;ll send you reminders.</p>
        </div>

        {/* Post-RSVP action bar */}
        <div className="flex gap-2">
          <a
            href={`/api/turnout/${slug}/ics`}
            download
            className="flex-1 h-12 rounded-lg bg-white border border-separator text-charcoal text-sm font-medium flex items-center justify-center gap-2 hover:bg-warm transition-colors"
          >
            <CalendarIcon />
            Add to Calendar
          </a>
          {directionsHref && (
            <a
              href={directionsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 h-12 rounded-lg bg-white border border-separator text-charcoal text-sm font-medium flex items-center justify-center gap-2 hover:bg-warm transition-colors"
            >
              <MapPinIcon />
              Get Directions
            </a>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      {state === 'error' && errorMessage && (
        <p className="text-sm text-red-600 mb-2">{errorMessage}</p>
      )}
      <button
        type="button"
        onClick={handleRsvpClick}
        disabled={state === 'loading'}
        className="w-full h-12 rounded-lg bg-terracotta text-white font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
        data-testid="rsvp-button"
      >
        {state === 'loading' ? 'Working...' : 'RSVP Now'}
      </button>

      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          title="One step to RSVP"
          body="We'll text you a confirmation and reminders — no account needed."
          onClose={() => setShowAuthModal(false)}
          onSuccess={async () => {
            setShowAuthModal(false)
            await doRsvp()
          }}
        />
      )}
    </>
  )
}
