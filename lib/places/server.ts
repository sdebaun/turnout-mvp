/**
 * Server-only Places API utilities.
 * Uses GOOGLE_MAPS_API_KEY (no NEXT_PUBLIC_ prefix) — never exposed to the browser.
 * Failures are always silent — a missing og:image is fine, a 500 is not.
 */

/**
 * Fetches the first photo URL for a Google Places location.
 * Used to populate og:image on turnout pages — a venue photo makes share links
 * significantly more clickable in Signal/WhatsApp group chats, which is the
 * primary viral vector for turnout discovery.
 *
 * Cache TTL: 24h — venue photos change rarely, so this mostly hits cache.
 */
export async function fetchVenuePhotoUrl(placeId: string | null): Promise<string | null> {
  if (!placeId) return null

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}?fields=photos&key=${apiKey}`,
      { next: { revalidate: 86400 } }
    )
    if (!res.ok) return null

    const data = await res.json()
    const ref = data.photos?.[0]?.name
    if (!ref) return null

    return `https://places.googleapis.com/v1/${ref}/media?maxWidthPx=1200&key=${apiKey}`
  } catch {
    return null
  }
}
