'use client'

import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps'
import { useEffect, useState } from 'react'

// Three warm placeholder bars — shown while loading or when no photos are available.
// Same warm-sand bg as skeleton bars in the wizard preview.
function PhotoPlaceholders() {
  return (
    <div className="flex gap-1 h-[120px]">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex-1 rounded-md bg-warm" />
      ))}
    </div>
  )
}

/**
 * Inner component that renders venue photos via the Places API.
 * Only mounted when APIProvider is in the tree (wrapping VenuePhotoStrip handles that).
 */
function VenuePhotoStripInner({ placeId }: { placeId: string }) {
  const placesLib = useMapsLibrary('places')
  const [photoUrls, setPhotoUrls] = useState<string[]>([])

  useEffect(() => {
    if (!placesLib || !placeId) return

    // PlacesService requires a DOM element to attach to — a detached div is fine for
    // non-map usage. We only need the photos, not the attribution UI.
    const service = new placesLib.PlacesService(document.createElement('div'))
    service.getDetails(
      { placeId, fields: ['photos'] },
      (result, status) => {
        if (status === placesLib.PlacesServiceStatus.OK && result?.photos) {
          const urls = result.photos
            .slice(0, 3)
            .map((p) => p.getUrl({ maxWidth: 400, maxHeight: 300 }))
          setPhotoUrls(urls)
        }
      }
    )
  }, [placesLib, placeId])

  if (photoUrls.length === 0) {
    return <PhotoPlaceholders />
  }

  return (
    <div className="flex gap-1 h-[120px]">
      {photoUrls.map((url, i) => (
        // alt="" — decorative context photos, not meaningful content
        <img key={i} src={url} alt="" className="flex-1 rounded-md object-cover" />
      ))}
    </div>
  )
}

interface VenuePhotoStripProps {
  placeId: string | null
}

/**
 * Renders 3 venue photos from Google Places for a given placeId.
 *
 * APIProvider is scoped here rather than in the root layout — the Maps JS API
 * is only needed on turnout pages, not the whole app.
 *
 * Falls back to warm placeholder bars if placeId is null, API key is missing,
 * or Places returns no photos.
 */
export function VenuePhotoStrip({ placeId }: VenuePhotoStripProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!placeId || !apiKey) {
    return <PhotoPlaceholders />
  }

  return (
    <APIProvider apiKey={apiKey} libraries={['places']}>
      <VenuePhotoStripInner placeId={placeId} />
    </APIProvider>
  )
}
