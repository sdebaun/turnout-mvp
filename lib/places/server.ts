/**
 * Returns a URL for a venue photo suitable for use in og:image.
 * Points to /api/venue-photo?placeId=... (our server-side proxy) rather than
 * the raw Google endpoint, so the API key never appears in HTML source.
 *
 * Returns null if placeId is missing — callers skip og:image in that case.
 */
export function fetchVenuePhotoUrl(placeId: string | null): string | null {
  if (!placeId) return null
  // NEXT_PUBLIC_GOOGLE_MAPS_API_KEY must exist for the proxy to work.
  // If it's not set (local dev without Google Maps configured), skip og:image silently.
  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) return null
  return `/api/venue-photo?placeId=${encodeURIComponent(placeId)}`
}
