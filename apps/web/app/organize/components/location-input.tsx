'use client'

import { useRef, useEffect, useState } from 'react'
import { APIProvider, useApiIsLoaded } from '@vis.gl/react-google-maps'
import dynamic from 'next/dynamic'
import type { LocationData } from '../actions'

interface LocationInputInnerProps {
  value: LocationData | null
  onChange: (location: LocationData) => void
  error?: string
}

/**
 * Inner component that uses the new gmp-place-autocomplete web component.
 * Must be a child of APIProvider so the Maps JS API is loaded first.
 *
 * Uses the new Places API (not the legacy Autocomplete that died March 1 2025).
 * The gmp-select event fires with a PlacePrediction; we call toPlace().fetchFields()
 * to get coordinates and formatted address.
 */
function PlacesAutocompleteInput({ onChange, error }: LocationInputInnerProps) {
  const elementRef = useRef<google.maps.places.PlaceAutocompleteElement>(null)
  const apiIsLoaded = useApiIsLoaded()
  const [apiError, setApiError] = useState(false)

  // Wire up gmp-select listener once the element is in the DOM.
  // The web component handles its own loading — no need to wait for placesLib.
  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const handleSelect = async (event: Event) => {
      // gmp-select extends plain Event (not CustomEvent) — placePrediction is on the event itself,
      // not in event.detail. The Google types describe PlaceAutocompletePlaceSelectEvent
      // but the actual runtime object has this shape.
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
        // fetchFields failed — not much we can do, form stays invalid
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
      <div>
        <p className="text-sm text-red-600" role="alert">
          Location search is unavailable. Please refresh the page or contact support.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* gmp-place-autocomplete is a Google Maps web component — styles are shadow DOM.
          We can't apply Tailwind classes to the inner input, but width is controllable. */}
      <gmp-place-autocomplete
        ref={elementRef}
        style={{ width: '100%' }}
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
 * Wraps PlacesAutocompleteInput in the APIProvider.
 * Exported via dynamic() with ssr:false since Maps JS API needs window.
 */
function LocationInputWrapper({ value, onChange, error }: LocationInputInnerProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    return (
      <div>
        <p className="text-sm text-red-600" role="alert">
          Location search is unavailable. Please refresh the page or contact support.
        </p>
      </div>
    )
  }

  return (
    <APIProvider apiKey={apiKey} libraries={['places']}>
      <PlacesAutocompleteInput value={value} onChange={onChange} error={error} />
    </APIProvider>
  )
}

// dynamic() with ssr:false — Maps JS API needs window.
// Disabled placeholder input as loading fallback prevents layout shift.
const LocationInput = dynamic(
  () => Promise.resolve(LocationInputWrapper),
  {
    ssr: false,
    loading: () => (
      <input
        type="text"
        disabled
        placeholder="Loading location search..."
        className="border border-gray-300 rounded-md px-3 py-2 text-base w-full bg-gray-100 text-gray-500"
      />
    ),
  }
)

export { LocationInput }
export type { LocationInputInnerProps as LocationInputProps }
