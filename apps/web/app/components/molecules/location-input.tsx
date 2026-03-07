'use client'

import { useRef, useEffect, useState } from 'react'
import { APIProvider, useApiIsLoaded } from '@vis.gl/react-google-maps'
import dynamic from 'next/dynamic'
import { X } from 'lucide-react'
import { MapPinIcon } from '@/app/components/atoms/icons'
import type { LocationData } from '@/app/organize/actions'

interface LocationInputInnerProps {
  value: LocationData | null
  onChange: (location: LocationData | null) => void
  error?: string
}

/**
 * Inner component that renders the gmp-place-autocomplete web component.
 * Only rendered when no location is selected (LocationInputWrapper handles the selected state).
 */
function PlacesAutocompleteInput({ onChange, error }: Omit<LocationInputInnerProps, 'value'>) {
  const elementRef = useRef<google.maps.places.PlaceAutocompleteElement>(null)
  const apiIsLoaded = useApiIsLoaded()
  const [apiError, setApiError] = useState(false)

  // Wire up gmp-select listener once the element is in the DOM.
  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const handleSelect = async (event: Event) => {
      const { placePrediction } = event as Event & {
        placePrediction: google.maps.places.PlacePrediction | undefined
      }
      if (!placePrediction) return

      try {
        const place = placePrediction.toPlace()
        await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location', 'id'] })

        onChange({
          name: place.displayName ?? '',
          formattedAddress: place.formattedAddress ?? undefined,
          lat: place.location?.lat() ?? undefined,
          lng: place.location?.lng() ?? undefined,
          placeId: place.id ?? undefined,
        })
      } catch {
        // fetchFields failed — form stays invalid
      }
    }

    element.addEventListener('gmp-select', handleSelect)
    return () => element.removeEventListener('gmp-select', handleSelect)
  }, [onChange])

  // Detect API load failure after a reasonable timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!apiIsLoaded) setApiError(true)
    }, 10000)
    return () => clearTimeout(timer)
  }, [apiIsLoaded])

  if (apiError) {
    return (
      <p className="text-sm text-red-600" role="alert">
        Location search is unavailable. Please refresh the page or contact support.
      </p>
    )
  }

  return (
    <div>
      {/* gmp-place-autocomplete is a Google Maps web component — styles are shadow DOM.
          Inline width ensures the custom element measures its container before Maps API upgrades it.
          Design shows a MapPin icon on the left; we get a magnifying glass instead because the
          icon is rendered inside the shadow DOM and cannot be overridden without forking the component. */}
      {/* placeholder spread via cast — the TS type for gmp-place-autocomplete omits this
          valid HTML attribute so direct assignment errors; spreading as {} sidesteps it */}
      {/* types="establishment|address" excludes city/region geocode results — users must
          pick a named place (park, venue, business) or a specific street address, not just "Ventura" */}
      <gmp-place-autocomplete
        ref={elementRef}
        style={{ width: '100%' }}
        {...({ placeholder: 'Coffee shop, park, address...', types: 'establishment|address' } as {})}
        data-testid="location-input"
      />
      {error && (
        <p className="text-sm text-red-600 mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * Wraps PlacesAutocompleteInput in the APIProvider, plus handles selected-state display.
 * When a location has been selected, shows a confirmation row with the place name and a
 * clear (×) button — matching the sage-tinted border treatment of Date/Time inputs.
 * Exported via dynamic() with ssr:false since Maps JS API needs window.
 */
function LocationInputWrapper({ value, onChange, error }: LocationInputInnerProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  // Selected state — shown regardless of API key presence.
  // The gmp-place-autocomplete element clears itself after selection (native behavior),
  // so we replace it entirely with this visible confirmation row.
  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2.5 border border-sage/30">
        <MapPinIcon className="text-terracotta flex-shrink-0" aria-hidden="true" />
        <span className="flex-1 min-w-0 text-sm text-charcoal font-sans truncate">{value.name}</span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="flex-shrink-0 text-sand hover:text-muted rounded p-0.5 cursor-pointer"
          aria-label="Clear location"
        >
          <X size={14} strokeWidth={2} />
        </button>
      </div>
    )
  }

  if (!apiKey) {
    throw new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is required')
  }

  return (
    <APIProvider apiKey={apiKey} libraries={['places']}>
      <PlacesAutocompleteInput onChange={onChange} error={error} />
    </APIProvider>
  )
}

// dynamic() with ssr:false — Maps JS API needs window.
const LocationInput = dynamic(
  () => Promise.resolve(LocationInputWrapper),
  {
    ssr: false,
    loading: () => (
      <input
        type="text"
        disabled
        placeholder="Loading location search..."
        className="w-full rounded-lg bg-white px-3 py-2.5 border border-sage/30 text-sm text-sand font-sans opacity-60"
      />
    ),
  }
)

export { LocationInput }
export type { LocationInputInnerProps as LocationInputProps }
