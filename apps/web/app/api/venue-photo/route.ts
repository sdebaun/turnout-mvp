import { NextRequest } from 'next/server'

/**
 * Server-side proxy for Google Places venue photos.
 * Accepts ?placeId=... and streams the photo back, keeping the API key server-side.
 * The og:image URL points here instead of the raw Google endpoint.
 */
export async function GET(request: NextRequest) {
  const placeId = request.nextUrl.searchParams.get('placeId')
  if (!placeId) return new Response('Missing placeId', { status: 400 })

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) return new Response('Not configured', { status: 404 })

  const placesRes = await fetch(
    `https://places.googleapis.com/v1/places/${placeId}?fields=photos&key=${apiKey}`,
    { next: { revalidate: 86400 } }
  )
  if (!placesRes.ok) return new Response('Not found', { status: 404 })

  const data = await placesRes.json()
  const ref = data.photos?.[0]?.name
  if (!ref) return new Response('No photos', { status: 404 })

  const photoRes = await fetch(
    `https://places.googleapis.com/v1/${ref}/media?maxWidthPx=1200&key=${apiKey}`
  )
  if (!photoRes.ok) return new Response('Photo fetch failed', { status: 502 })

  return new Response(photoRes.body, {
    headers: {
      'Content-Type': photoRes.headers.get('Content-Type') ?? 'image/jpeg',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  })
}
