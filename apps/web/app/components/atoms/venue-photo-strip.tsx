// Placeholder photos until venue images are stored in the DB (see ICEBOX).
// Fixed seeds so SSR renders consistently; swap for real urls from DB later.
const PLACEHOLDER_URLS = [
  'https://picsum.photos/seed/v1/400/300',
  'https://picsum.photos/seed/v2/400/300',
  'https://picsum.photos/seed/v3/400/300',
]

export function VenuePhotoStrip({ urls = PLACEHOLDER_URLS }: { urls?: string[] }) {
  return (
    <div className="flex gap-1 h-[120px]">
      {urls.slice(0, 3).map((url, i) => (
        // alt="" — decorative context photos, not meaningful content
        <img key={i} src={url} alt="" className="flex-1 rounded-md object-cover" />
      ))}
    </div>
  )
}
