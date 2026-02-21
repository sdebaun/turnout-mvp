'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { APIProvider, useApiIsLoaded, useMapsLibrary } from '@vis.gl/react-google-maps'
import dynamic from 'next/dynamic'
import type { LocationData } from '../actions'

interface LocationInputInnerProps {
  value: LocationData | null
  onChange: (location: LocationData) => void
  error?: string
}

/**
 * Inner component that uses the Maps API hooks — must be a child of APIProvider.
 * Uses the classic google.maps.places.Autocomplete widget which handles
 * session tokens automatically (cheaper than per-keystroke billing).
 */
function PlacesAutocompleteInput({ value, onChange, error }: LocationInputInnerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const apiIsLoaded = useApiIsLoaded()
  const placesLib = useMapsLibrary('places')
  const [apiError, setApiError] = useState(false)
  // Track whether user has selected from dropdown vs just typed freeform
  const [hasSelected, setHasSelected] = useState(false)
  const [inputValue, setInputValue] = useState(value?.name ?? '')

  // Wire up the Autocomplete widget once the Places library loads
  useEffect(() => {
    if (!placesLib || !inputRef.current || autocompleteRef.current) return

    try {
      const autocomplete = new placesLib.Autocomplete(inputRef.current, {
        fields: ['name', 'formatted_address', 'geometry', 'place_id'],
      })

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        if (!place.geometry?.location) {
          // User pressed enter without selecting — don't treat as valid
          return
        }

        const locationData: LocationData = {
          name: place.name ?? '',
          formattedAddress: place.formatted_address,
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          placeId: place.place_id,
        }

        setHasSelected(true)
        setInputValue(place.name ?? '')
        onChange(locationData)
      })

      autocompleteRef.current = autocomplete
    } catch {
      setApiError(true)
    }
  }, [placesLib, onChange])

  // Detect API load failure after a reasonable timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!apiIsLoaded && !placesLib) {
        setApiError(true)
      }
    }, 10000)
    return () => clearTimeout(timer)
  }, [apiIsLoaded, placesLib])

  if (apiError) {
    return (
      <div>
        <p className="text-sm text-red-600" role="alert">
          Location search is unavailable. Please refresh the page or contact support.
        </p>
      </div>
    )
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    // If user edits after selecting, invalidate the selection
    if (hasSelected) {
      setHasSelected(false)
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder="Search for a place..."
        className="border border-gray-300 rounded-md px-3 py-2 text-base w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        aria-label="Location"
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
