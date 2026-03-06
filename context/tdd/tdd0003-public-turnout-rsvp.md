# TDD: Public Turnout Page + RSVP

**PRD:** prd0003-public-turnout-rsvp.md
**Status:** Ready for Implementation
**Last Updated:** 2026-03-05

## Context

_What I found:_

- **Vision alignment:** "Someone creates a turnout. Someone shares it. Someone says yes." This feature IS that second and third beat. Without it, Bob created something nobody can act on. The stub `/t/[slug]` from TDD0002 says "full details coming soon" — this replaces that with the real page.
- **Roadmap phase:** MVP Week 4-5. Third initiative. Depends on TDD0001 (phone auth, live) and TDD0002 (group/turnout creation, live). Drives: "Time to first RSVP <24 hours" and "RSVP completion ≥80%."
- **Architecture constraints:** Next.js App Router, Server Components + Server Actions, Prisma + Postgres (Neon), SST on AWS. TypeScript. `neverthrow` for error handling. Server Actions over API routes — except for .ics file download (must be a route handler returning binary data with headers).
- **TDD0002 contract:** `/t/[slug]` page exists as a stub. `getTurnoutBySlug` returns turnout + group + primaryLocation. `AuthModal` + `OTPInputForm` are live and refactored (no implicit `router.refresh()`). Reuse all of this.
- **What doesn't exist yet:** No `Engagement` model in schema. No RSVP logic. No .ics generation. The public (non-organizer) view is a placeholder.
- **Schema note from TDD0002:** `Turnout.endsAt` is nullable. Default to `startsAt + 2 hours` for .ics. Noted here as promised.

---

## Overview

**Problem:** Alice clicks a link. She sees "Full details coming soon." She closes the tab. This is where the network dies.

**Solution:** Replace the stub public view with a real turnout page. Add a one-tap RSVP flow that reuses the existing `AuthModal` for unauthenticated users and a single server action call for authenticated users. Generate an .ics calendar file on RSVP so Alice doesn't forget. Track RSVPs in a new `Engagement` model.

**Scope:**

- ✅ Real public turnout page: title, group, organizer, date/time, location, RSVP count, RSVP button
- ✅ OpenGraph meta tags for link preview in Signal/WhatsApp/iMessage
- ✅ RSVP Server Action — creates `Engagement` record, checks for duplicates
- ✅ Unauthenticated RSVP: `AuthModal` → OTP → engagement created
- ✅ Authenticated RSVP: one-tap, no modal
- ✅ Post-RSVP state: confirmation + calendar download button + directions link
- ✅ `.ics` calendar file: API route handler, correct RFC 5545 format with VALARM
- ✅ "Get Directions" link: `https://maps.google.com/maps?q={lat},{lng}` (no extra API needed)
- ✅ Softened RSVP count ("Over 20 people RSVP'd!")
- ❌ No embedded map (Static Maps API adds complexity; directions link is sufficient for MVP)
- ❌ No RSVP cancellation via web (SMS cancellation in TDD0004)
- ❌ No public participant lists
- ❌ No capacity limits

---

## Components

**What this touches:**

- [x] Database (Prisma schema: new `Engagement` model, add relations to `User` + `Opportunity`)
- [x] Library functions (`lib/engagements/`) — RSVP creation, count, dedup check
- [x] Server Actions (`apps/web/app/t/[slug]/actions.ts`) — `rsvpAction`
- [x] API Route (`apps/web/app/api/turnout/[slug]/ics/route.ts`) — .ics file download
- [x] Frontend — transform `/t/[slug]` public view from stub to real page
- [x] Frontend — update `getTurnoutBySlug` to include `createdByUser` (organizer name)
- [ ] Background jobs (none — reminders are TDD0004)

---

## Database Schema

### New Enum

```prisma
enum EngagementStatus {
  CONFIRMED  // RSVP'd and intends to attend
  CANCELED   // Canceled via SMS (TDD0004) or future web cancel
  CHECKED_IN // Checked in at the event (TDD0005)
  NO_SHOW    // Did not check in (set by cron post-event, TDD0005)
}
```

### New Model

```prisma
// An engagement begins when a user RSVPs to an opportunity.
// Records what actually happened: confirmed, canceled, checked in, or no-show.
// Unique on (userId, opportunityId) — prevents duplicate RSVPs without
// needing application-level dedup logic.
model Engagement {
  id            String           @id @default(cuid())

  userId        String
  user          User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  opportunityId String
  opportunity   Opportunity      @relation(fields: [opportunityId], references: [id], onDelete: Cascade)

  status        EngagementStatus @default(CONFIRMED)

  confirmedAt   DateTime         @default(now())
  canceledAt    DateTime?        // Set when status → CANCELED
  checkedInAt   DateTime?        // Set when status → CHECKED_IN (TDD0005)

  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt

  // Prevents duplicate RSVPs: same user, same opportunity = same promise.
  @@unique([userId, opportunityId])
  @@index([opportunityId])
  @@index([userId])
}
```

### Changes to Existing Models

Add back-relations to support the new FK relationships:

**`User` model:** add `engagements Engagement[]`

**`Opportunity` model:** add `engagements Engagement[]`

### Migration Notes

- New table + new enum. No alterations to existing columns. Safe to deploy without downtime.
- Run `pnpm db:migrate`, name it `public-turnout-rsvp`.
- The `@@unique([userId, opportunityId])` constraint enforces dedup at the DB level — application logic should still check first and return a user-friendly error rather than letting Prisma throw a P2002.

---

## Library Functions

**Files:** `lib/engagements/engagements.ts`, `lib/engagements/index.ts`

**Pattern:** Same as `lib/groups/` — thin business logic, `neverthrow` for error handling, Prisma queries, no HTTP concerns.

---

### `createEngagement(userId, opportunityId)` → `ResultAsync<Engagement, EngagementError>`

Creates an `Engagement` record with `status: CONFIRMED`. Checks for an existing engagement first — if found with `status: CONFIRMED`, returns `err({ code: 'ALREADY_RSVPD' })`. If found with `status: CANCELED`, re-confirms it (update status back to CONFIRMED, clear `canceledAt`). If not found, creates fresh.

```typescript
type EngagementError =
  | { code: 'ALREADY_RSVPD' }
  | { code: 'OPPORTUNITY_NOT_FOUND' }
  | { code: 'DB_ERROR'; message: string }
```

**Steps:**
1. Verify opportunity exists → `err({ code: 'OPPORTUNITY_NOT_FOUND' })` if null
2. Check `prisma.engagement.findUnique({ where: { userId_opportunityId: { userId, opportunityId } } })`
3. If exists + CONFIRMED → `err({ code: 'ALREADY_RSVPD' })`
4. If exists + CANCELED → update to CONFIRMED, null `canceledAt`, return `ok(engagement)`
5. If not found → `prisma.engagement.create(...)` → `ok(engagement)`
6. Wrap in `ResultAsync.fromPromise` to catch any remaining DB errors

---

### `getRsvpCount(opportunityId)` → `Promise<number | null>`

Simple count: `prisma.engagement.count({ where: { opportunityId, status: 'CONFIRMED' } })`.

Returns `null` on any DB error. The caller must treat `null` as "hide the count row entirely" — do NOT fall back to 0, because `formatRsvpCount(0)` outputs "Be the first to RSVP!" which is actively wrong when the query failed and 80 people are confirmed.

---

### `getUserEngagement(userId, opportunityId)` → `Promise<Engagement | null>`

Used to check if the current viewer has already RSVP'd (to show "You're going!" state on page load). Returns the engagement record or null.

---

### `getDefaultOpportunity(turnoutId)` → `Promise<Opportunity | null>`

Fetches the first (and in MVP, only) opportunity for a turnout. Used by the RSVP action to look up `opportunityId` from `turnoutId`. In MVP there's always exactly one opportunity per turnout ("Show Up"), but we fetch by query rather than assuming we know the ID.

```typescript
return prisma.opportunity.findFirst({ where: { turnoutId } })
```

---

## Server Actions

**File:** `apps/web/app/t/[slug]/actions.ts`

All marked `'use server'`.

---

### `rsvpAction(slug)` → `Promise<{ success: true } | { error: string }>`

**Auth required:** Yes — returns `{ error: 'Not authenticated' }` if no session. The unauthenticated flow goes through `AuthModal` first; by the time this action fires, the user is authenticated.

**Steps:**
1. `getUser()` → return `{ error: 'Not authenticated' }` if null
2. `getTurnoutBySlug(slug)` → return `{ error: 'Turnout not found' }` if null
3. `getDefaultOpportunity(turnout.id)` → return `{ error: 'No opportunity found' }` if null
4. `createEngagement(user.id, opportunity.id)` →
   - `err({ code: 'ALREADY_RSVPD' })` → return `{ error: "You're already going to this one." }`
   - `err({ code: 'DB_ERROR', message })` → log + return `{ error: 'Something went wrong. Please try again.' }`
5. On success: return `{ success: true }`

---

## API Routes

### `GET /api/turnout/[slug]/ics`

**File:** `apps/web/app/api/turnout/[slug]/ics/route.ts`

Returns a downloadable `.ics` calendar file. No auth required — public. The link is handed out post-RSVP and is just a convenience; no sensitive data in the file.

**Request:** `GET /api/turnout/[slug]/ics`

**Response:** `200 text/calendar` with attachment header, `.ics` body

**Response headers:**
```
Content-Type: text/calendar; charset=utf-8
Content-Disposition: attachment; filename="turnout-[slug].ics"
```

**Implementation:**
1. `getTurnoutBySlug(slug)` → 404 if null
2. Compute `endsAt`: `turnout.endsAt ?? new Date(turnout.startsAt.getTime() + 2 * 60 * 60 * 1000)`
3. Build `.ics` content string (see format below)
4. Return `new Response(icsContent, { headers })`

**`.ics` format** (RFC 5545 compliant):

```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//turnout.network//TDD0003//EN
BEGIN:VEVENT
UID:[turnout.id]@turnout.network
DTSTAMP:[now in UTC, YYYYMMDDTHHMMSSZ format]
DTSTART:[startsAt in UTC, YYYYMMDDTHHMMSSZ format]
DTEND:[endsAt in UTC, YYYYMMDDTHHMMSSZ format]
SUMMARY:[turnout.title]
DESCRIPTION:[turnout.description or group.mission, escaped for .ics]
LOCATION:[primaryLocation.formattedAddress or primaryLocation.name]
URL:[https://[host]/t/[slug]]
BEGIN:VALARM
TRIGGER:-PT1H
ACTION:DISPLAY
DESCRIPTION:Reminder: [turnout.title] starts in 1 hour
END:VALARM
END:VEVENT
END:VCALENDAR
```

**Escaping rules:** In .ics, commas, semicolons, and backslashes must be escaped with a backslash. Newlines in text fields use `\n`. Write a small `escapeIcs(str)` helper.

**Host resolution:** Read `host` from `request.headers.get('host')` to build the URL — same pattern as the existing turnout page. Don't hardcode.

---

## Frontend

### `fetchVenuePhotoUrl(placeId)` → `Promise<string | null>`

**File:** `lib/places/server.ts` (new — server-only Places utilities)

Fetches the first photo reference for a given `placeId` via Places API (New) and returns a usable photo URL. Returns `null` if placeId is null, the API call fails, or no photos are returned. Failure is silent — a missing og:image is fine, a 500 is not.

```typescript
async function fetchVenuePhotoUrl(placeId: string | null): Promise<string | null> {
  if (!placeId) return null
  const apiKey = process.env.GOOGLE_MAPS_API_KEY  // server-only, not NEXT_PUBLIC_
  if (!apiKey) return null

  const res = await fetch(
    `https://places.googleapis.com/v1/places/${placeId}?fields=photos&key=${apiKey}`,
    { next: { revalidate: 86400 } }  // cache 24h — venue photos don't change often
  )
  if (!res.ok) return null

  const data = await res.json()
  const ref = data.photos?.[0]?.name
  if (!ref) return null

  return `https://places.googleapis.com/v1/${ref}/media?maxWidthPx=1200&key=${apiKey}`
}
```

**Env var note:** Add `GOOGLE_MAPS_API_KEY` (without `NEXT_PUBLIC_`) as an SST secret alongside the existing `GoogleMapsApiKey`. Same API key value, different binding — one exposed to browser, one server-only.

---

### Updated `getTurnoutBySlug`

**File:** `lib/groups/groups.ts`

Add `createdByUser: { select: { displayName: true } }` to the `include` block. The organizer's display name is shown on the public turnout page for trust ("Organized by OrangeArmadillo").

No other change to the function signature or return type (Prisma infers the type).

---

### `/t/[slug]` — Public View Transformation

**File:** `apps/web/app/t/[slug]/page.tsx`

**Replace both branches of the existing page entirely.** The current file has: (1) an organizer branch with a "Your turnout is live!" success banner and scaffold styling, and (2) a public branch with "Full details coming soon." Both are stubs. Delete all existing JSX in both branches and implement from scratch per the specs below and the Pencil design.

**New queries needed (in the server component, before rendering):**
```typescript
// Get the viewer's current engagement status for "You're going!" state
const defaultOpportunity = await getDefaultOpportunity(turnout.id)
const existingEngagement = user && defaultOpportunity
  ? await getUserEngagement(user.id, defaultOpportunity.id)
  : null
const rsvpCount = defaultOpportunity
  ? await getRsvpCount(defaultOpportunity.id)
  : 0
```

**Add `generateMetadata` export** for OpenGraph / link previews:

```typescript
export async function generateMetadata({ params }: TurnoutPageProps): Promise<Metadata> {
  const turnout = await getTurnoutBySlug(params.slug)
  if (!turnout) return {}

  const description = [
    turnout.group.name,
    turnout.startsAt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    turnout.primaryLocation.name,
  ].join(' · ')

  // Fetch a venue photo URL for og:image — makes the share link significantly more
  // clickable in Signal/WhatsApp group chats, which is the primary viral vector.
  // Uses Places API server-side; requires GOOGLE_MAPS_API_KEY (server-only, no NEXT_PUBLIC_).
  // Next.js fetch() caching means this only hits Places once per build/revalidation.
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
```

**Remove `export const dynamic = 'force-dynamic'`** — with `generateMetadata`, Next.js will SSR automatically for dynamic routes. The explicit `force-dynamic` is redundant and prevents ISR if we ever want it.

**Public view content (replacing the stub):**

The page renders as a Server Component. The RSVP button is a Client Component that calls `rsvpAction` and handles the state transitions.

```
┌─────────────────────────────────┐
│ TopNav (public)                 │
├─────────────────────────────────┤
│ Group pill + organizer line     │
│ "Save Willow Creek"             │
│ "Organized by OrangeArmadillo"  │
├─────────────────────────────────┤
│ Turnout title (h1)              │
│ "First Planning Meeting"        │
├─────────────────────────────────┤
│ Date/time row                   │
│ "This Saturday · 7 PM"          │
├─────────────────────────────────┤
│ Location row                    │
│ "Joe's Coffee, Ventura CA"      │
│ [Get Directions ↗]              │
├─────────────────────────────────┤
│ Photo strip (3 venue photos)    │ ← client component, Google Places
├─────────────────────────────────┤
│ Description (if present)        │
├─────────────────────────────────┤
│ RSVP count (softened)           │
│ "23 people are going"           │
│   OR "Over 20 people are going" │
│   (hidden entirely if null)     │
├─────────────────────────────────┤
│ [RSVP Now] or [You're Going ✓]  │
│ Post-RSVP:                      │
│ [Add to Calendar] [Directions]  │
└─────────────────────────────────┘
```

**Photo strip:** Create `VenuePhotoStrip` as a new client component at `apps/web/app/components/venue-photo-strip.tsx`. The TDD0002 wizard preview has a skeleton placeholder where this would go — photos were deferred. Build it fresh here. Props: `placeId: string | null`. Uses `useMapsLibrary('places')` from `@vis.gl/react-google-maps` to load the Places library, then fetches photos via `google.maps.places.PlacesService`. Shows 3 photos max at `h-[120px]`, `object-cover`, rounded corners. Warm placeholder (`bg-warm`) if placeId is null, Places returns no photos, or while loading.

**`APIProvider` note:** The `APIProvider` from `@vis.gl/react-google-maps` is currently inside `LocationInput` (the organize wizard only) — it is NOT in the root layout. The `/t/[slug]` page has no `APIProvider` in its ancestor tree. Wrap `VenuePhotoStrip` at the usage site in its own `APIProvider` with `apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}` and `libraries={['places']}`. Do not add it to the root layout — scope it to the component that needs it.

---

### Client Components

**`apps/web/app/t/[slug]/rsvp-button.tsx`** — Client Component

Props:
```typescript
interface RsvpButtonProps {
  slug: string
  isAuthenticated: boolean
  initialEngagement: { status: EngagementStatus } | null
  // lat/lng for the "Get Directions" link shown post-RSVP
  lat: number | null
  lng: number | null
  formattedAddress: string
}
```

Note: `EngagementStatus` is a Prisma enum — use `import type { EngagementStatus } from '@prisma/client'` (type-only import, safe in client components).

**State machine:**
- `idle` — show "RSVP Now" button
- `confirmed` — show "You're going! ✓" + calendar download + directions links
- `loading` — show spinner, button disabled
- `error` — show error message + retry

**Initial state:** If `initialEngagement?.status === 'CONFIRMED'`, start in `confirmed` state. This handles returning users who already RSVP'd visiting the page again.

**RSVP flow (authenticated):**
1. User clicks "RSVP Now"
2. Set state to `loading`
3. Call `rsvpAction(slug)` directly
4. On `{ success: true }` → set state to `confirmed`
5. On `{ error }` → set state to `error`, show message

**RSVP flow (unauthenticated):**
1. User clicks "RSVP Now"
2. Open `AuthModal` with props:
   - `title`: "One step to RSVP"
   - `body`: "We'll text you a confirmation and reminders — no account needed."
   - `onSuccess`: async callback
3. `AuthModal` handles phone → display name (if new) → OTP exactly as designed
4. `onSuccess` fires when auth completes → call `rsvpAction(slug)` → set state to `confirmed`
5. Call `router.refresh()` after confirmed state to update the RSVP count on the page

**"Get Directions" link:** `https://maps.google.com/maps?q={lat},{lng}` — open in new tab. If `lat`/`lng` are null (shouldn't happen after TDD0002 enforced Places selection), fall back to `https://maps.google.com/maps?q={encodeURIComponent(formattedAddress)}`.

**Calendar download link (post-RSVP):** `<a href="/api/turnout/[slug]/ics" download>Add to Calendar</a>` — native `download` attribute triggers browser download.

---

### RSVP Count Display

**Softening logic** (in the Server Component, passed as prop to the page):

```typescript
function formatRsvpCount(count: number): string {
  // Suppress small counts — "2 people are going" can deter more than it encourages.
  // Show "Be the first!" until there's a credible crowd (5+).
  if (count < 5) return 'Be the first to RSVP!'
  if (count < 10) return `${count} people are going`
  // Round down to the nearest 5 strictly below count, so "Over N" is always true.
  // Math.floor((count - 1) / 5) * 5 guarantees softened < count.
  // e.g. count=10 → Over 5, count=11 → Over 10, count=15 → Over 10, count=16 → Over 15
  const softened = Math.floor((count - 1) / 5) * 5
  return `Over ${softened} people are going`
}
```

**File:** `lib/engagements/display.ts` — pure function, independently testable, not colocated in the page.

---

### Organizer Settled View

When the authenticated user is an organizer of the turnout's group, the page renders a different view. The design (Pencil frame "tdd0003 / organizer view") is source of truth for layout.

**Server-side guard:**
```typescript
const isOrganizer = user
  ? await prisma.groupOrganizer.findFirst({
      where: { groupId: turnout.groupId, userId: user.id }
    })
  : null
```

**Differences from the public view:**

1. **TopNav:** Use `topNav/authed` variant with `backLabel = group.name`. Tapping back → `/organize` (group dashboard, TDD0006 — use `href` for now, page may not exist yet).

2. **Organizer status card** (replaces RSVP button area):
   ```
   ✓ You're organizing this.
   23 RSVPs · 2 days to go — share the link!
   ```
   - RSVP count: `getRsvpCount(opportunity.id)` — live count
   - "2 days to go": relative time until `turnout.startsAt` (same relative time helper described below)
   - Card styling: `bg-[#F5F5F8]`, sage border, rounded-lg

3. **Share bar** (below organizer card, above tab nav):
   - Full-width terracotta "Share" button with `share-2` icon
   - `ShareButtons` already exists at `apps/web/app/t/[slug]/share-buttons.tsx` with the correct logic (`navigator.share` on touch devices, clipboard copy fallback). Reskin it to match the design (terracotta background, white text, `share-2` lucide icon, full-width). Do not rebuild it.
   - `inviteMessage` generated server-side: `"${group.name} is organizing ${turnout.title} on ${relativeDate}. Join us: "`

4. **Tab nav** (sticky bottom):
   - **Preview** (active, sage text + icon) — this page
   - **RSVPs** (inactive) — links to organizer RSVP list. TDD0006 will build that page. For now: `href="/organize/t/[slug]/rsvps"`, render the tab but the page can 404 until TDD0006.
   - **Edit** (inactive, greyed) — post-MVP. Render disabled, no href.

No RSVP button shown to the organizer. No "You're going!" state.

---

### Date/Time Display — Relative Format

**Decided:** implement human-relative time from day one. The design is explicit: "This Friday · 7 PM", not "Fri, Feb 27 @ 7:00 PM PST."

Install `date-fns` explicitly — only `date-fns-tz` is currently in `package.json`. Run `pnpm add date-fns` in the repo root.

```typescript
// lib/dates/relative.ts
function formatRelativeDate(date: Date, now = new Date()): string {
  const diffDays = differenceInCalendarDays(date, now)  // date-fns

  if (diffDays === 0) return `Today · ${format(date, 'h:mm a')}`
  if (diffDays === 1) return `Tomorrow · ${format(date, 'h:mm a')}`
  if (diffDays <= 6) return `This ${format(date, 'EEEE')} · ${format(date, 'h:mm a')}`
  if (diffDays <= 13) return `Next ${format(date, 'EEEE')} · ${format(date, 'h:mm a')}`
  return format(date, 'MMM d · h:mm a')  // "Mar 15 · 7 PM"
}
```

`date-fns` is already in the project (check `package.json` before installing). If not present, add it — it's standard and small.

Used in: public view date row, organizer status card "X days to go", organizer view date row. Pass `startsAt` as a prop from the server component; call `formatRelativeDate` on the server so the output is consistent (no client-side hydration mismatch).

---

## Auth & Permissions

- `/t/[slug]` is fully public. Anyone can view it.
- `rsvpAction` requires a session. Unauthenticated users go through `AuthModal` before calling it.
- `/api/turnout/[slug]/ics` is fully public (no sensitive data).
- The RSVP count is shown to everyone; participant identities are not.
- Organizer view is shown only when `groupOrganizer` record exists for the current user + group. Falls back to public view for everyone else.

---

## Edge Cases & Error Handling

| Scenario | Expected Behavior | Message |
|----------|------------------|---------|
| Already RSVP'd (re-visiting page) | Page loads in confirmed state | "You're going! ✓" |
| Already RSVP'd (calling action twice) | `ALREADY_RSVPD` error from action | "You're already going to this one." |
| No session when action fires | `{ error: 'Not authenticated' }` | Client should have gated behind AuthModal — this is a safety net |
| Turnout not found (bad slug) | `notFound()` → 404 page | — |
| No opportunity on turnout | Return `{ error: 'No opportunity found' }` | Should never happen in MVP (TDD0002 always creates one) |
| `startsAt` in the past | Page still shows (past turnouts are valid), RSVP still works | — |
| `lat`/`lng` null on location | Directions link falls back to address-based URL | — |
| `endsAt` null | .ics defaults to `startsAt + 2 hours` | — |
| `.ics` special chars in title/description | Escaped via `escapeIcs()` helper | — |
| `rsvpCount` query fails | `getRsvpCount` returns null → hide count row entirely, don't 500 | — |
| `AuthModal` dismissed without completing OTP | Modal closes, nothing changes | Alice just closed it |

---

## Testing Strategy

### Tier 1: Unit Tests (Vitest)

**File:** `lib/engagements/engagements.test.ts`

Uses dev Neon DB. Truncate in `beforeEach` in FK order (children before parents — extend the existing FK order from TDD0002, adding `Engagement` before `Opportunity`):
`Engagement` → `Opportunity` → `Turnout` → `GroupOrganizer` → `Group` → `Location` → `Session` → `Credential` → `User`

**`createEngagement` tests:**
- Creates engagement with `status: CONFIRMED`
- Returns `err({ code: 'ALREADY_RSVPD' })` when called twice with same userId + opportunityId
- Re-confirms a CANCELED engagement (status → CONFIRMED, `canceledAt` cleared)
- Returns `err({ code: 'OPPORTUNITY_NOT_FOUND' })` for non-existent opportunityId

**`getRsvpCount` tests:**
- Returns 0 for known opportunityId with no engagements
- Returns correct count for CONFIRMED engagements
- Excludes CANCELED engagements from count
- Returns null when DB throws (simulate with invalid connection or mock)

**`getUserEngagement` tests:**
- Returns engagement when found
- Returns null when not found

**`getDefaultOpportunity` tests:**
- Returns the "Show Up" opportunity for a valid turnoutId
- Returns null for unknown turnoutId

**`formatRsvpCount` tests:**
- 0 → "Be the first to RSVP!"  ← suppressed
- 1 → "Be the first to RSVP!"  ← suppressed (below threshold)
- 4 → "Be the first to RSVP!"  ← suppressed (below threshold)
- 5 → "5 people are going"     ← threshold, exact display begins
- 9 → "9 people are going"
- 10 → "Over 5 people are going"  ← softening kicks in; "Over 10" would be false
- 11 → "Over 10 people are going"
- 15 → "Over 10 people are going" ← "Over 15" would be false
- 16 → "Over 15 people are going"
- 23 → "Over 20 people are going"
- 100 → "Over 95 people are going"

---

**File:** `apps/web/app/t/[slug]/actions.test.ts`

Mock `lib/engagements` and `lib/groups`. Use test session via `createSession`.

- Returns `{ error: 'Not authenticated' }` when no session
- Returns `{ error: 'Turnout not found' }` for unknown slug
- Returns `{ success: true }` on valid call with active session
- Returns `{ error: "You're already going to this one." }` when `createEngagement` returns `ALREADY_RSVPD`

---

**File:** `apps/web/app/api/turnout/[slug]/ics/route.test.ts`

- Returns 404 for unknown slug
- Returns 200 with `Content-Type: text/calendar` for known slug
- Response body includes DTSTART, DTEND, SUMMARY matching turnout data
- DTEND is `startsAt + 2h` when `endsAt` is null
- DTEND is `endsAt` when set
- Body includes VALARM with `-PT1H` trigger
- Special characters in title/description are escaped (test with `&`, `,`, `;`, `\`)

---

### Tier 2: E2E Tests (Playwright)

**File:** `tests/e2e/tdd0003-public-turnout-rsvp/rsvp.spec.ts`

**Test setup:** Use an existing turnout from TDD0002 E2E tests, or create one via the test API. The cleanup endpoint from TDD0002 must be reused — extend it if needed for `Engagement` records.

#### Test 1: Public page renders correctly (no auth)

1. Navigate to `/t/[known-slug]`
2. Assert: turnout title visible
3. Assert: group name visible
4. Assert: date + time visible
5. Assert: location name visible
6. Assert: "Get Directions" link present with `href` containing `maps.google.com`
7. Assert: RSVP button visible ("RSVP Now" or similar)
8. Assert: NOT showing organizer invite message (public view, not organizer view)

#### Test 2: OpenGraph meta tags present

1. Navigate to `/t/[known-slug]`
2. Assert: `<meta property="og:title">` contains turnout title
3. Assert: `<meta property="og:description">` contains group name

#### Test 3: Unauthenticated RSVP flow

1. Cleanup any engagement for `+12025550120`
2. Navigate to `/t/[known-slug]`
3. Click "RSVP Now"
4. Assert: `AuthModal` opens (phone input visible)
5. Fill phone: `+12025550120`
6. If new user: accept display name, proceed
7. Enter `000000` (TEST_OTP_BYPASS)
8. Assert: "You're going!" confirmation visible
9. Assert: "Add to Calendar" link visible
10. Assert: "Get Directions" link visible

#### Test 4: Authenticated RSVP (no modal)

1. Seed user + session for `+12025550121`
2. Set session cookie
3. Cleanup any engagement for that user on this turnout
4. Navigate to `/t/[known-slug]`
5. Click "RSVP Now"
6. Assert: `AuthModal` does NOT open
7. Assert: "You're going!" confirmation visible without modal

#### Test 5: Already RSVP'd (page shows confirmed state on load)

1. Seed user + session + engagement for `+12025550122`
2. Set session cookie
3. Navigate to `/t/[known-slug]`
4. Assert: page loads already showing "You're going!" — no RSVP button visible

#### Test 6: Calendar .ics download

1. Navigate to `/api/turnout/[known-slug]/ics`
2. Assert: response status 200
3. Assert: `Content-Type` header includes `text/calendar`
4. Assert: response body includes `BEGIN:VCALENDAR`
5. Assert: response body includes the turnout title in `SUMMARY:`

---

## Cleanup Endpoint Extension

The `/api/test/cleanup` endpoint from TDD0002 deletes users and their cascading data. `Engagement` records are children of `User` (cascade delete on user deletion), so they're covered automatically.

If tests need to reset engagement state without deleting the user (e.g., Test 5 above requires creating an engagement before the test), add an `engagementIds` parameter to cleanup for targeted engagement deletion.

---

## NPM Dependencies

No new runtime dependencies needed.

- `text/calendar` generation uses string templates — no library needed
- Date math for `endsAt` default uses native `Date` arithmetic — no library needed

---

## Open Questions / Decisions Made

**Made:**
- ✅ **No embedded map in MVP:** A "Get Directions" link with `lat,lng` coordinates is sufficient. Avoids Maps Static API setup and API key issues. Easy to add later.
- ✅ **Suppress RSVP count below 5:** "2 people are going" can deter more than encourage. Show "Be the first to RSVP!" until 5+ confirmed. Threshold is a constant — easy to tune post-launch.
- ✅ **Softened RSVP count at 10+:** `Math.floor((count - 1) / 5) * 5` ensures "Over N" is always strictly true.
- ✅ **Human-relative date display:** "This Friday · 7 PM" not "Fri, Feb 27 @ 7:00 PM". Implemented via `formatRelativeDate` in `lib/dates/relative.ts` using `date-fns`. Called server-side to avoid hydration mismatch.
- ✅ **`rsvpAction` returns `{ success: true }` only:** No payload — the .ics URL uses slug which the client already has.
- ✅ **`rsvpAction` lives in `apps/web/app/t/[slug]/actions.ts`:** Colocated with the page that uses it. If RSVP ever needs to be called from multiple surfaces, move to `lib/engagements/` at that point.
- ✅ **`.ics` as API route, not Server Action:** Must return binary data with `Content-Type: text/calendar` and `Content-Disposition: attachment`. Server Actions can't do this cleanly. Route handler is the right tool.
- ✅ **`endsAt` defaults to `startsAt + 2 hours` in .ics:** Noted in TDD0002, implemented here.
- ✅ **og:image via Places API server-side:** Share links with venue photo are substantially more clickable in group chats — the primary viral mechanic. Fetch + cache 24h. Fails silently.
- ✅ **`router.refresh()` after RSVP:** The RSVP count shown on page is server-rendered. After confirming, call `router.refresh()` so the count updates. The "You're going!" state is managed in client state so it doesn't flicker back during refresh.
- ✅ **Re-confirming canceled engagements:** If someone canceled (via SMS, TDD0004) and comes back to RSVP again, we update the existing record rather than creating a new one. Keeps history clean, avoids unique constraint errors.
- ✅ **`getTurnoutBySlug` extended to include `createdByUser`:** The organizer's display name adds trust to the public page. Cheap to add now; ugly to retrofit later.
- ✅ **`getDefaultOpportunity` as a lib function:** Keeps the action thin. In TDD0006 (multi-opportunity), this function can evolve to return all opportunities or let the user pick.
- ✅ **`VenuePhotoStrip` built fresh:** TDD0002 wizard preview has a skeleton placeholder, not a real implementation. Build the client component new in `apps/web/app/components/venue-photo-strip.tsx`. Wrap usage in its own `APIProvider` — `APIProvider` is NOT in root layout, only inside `LocationInput`.
- ✅ **`ShareButtons` reskinned, not rebuilt:** Logic already correct at `apps/web/app/t/[slug]/share-buttons.tsx`. Apply terracotta styling to match organizer view design.
- ✅ **`date-fns` needs explicit install:** Only `date-fns-tz` is in `package.json`. Run `pnpm add date-fns`.
- ✅ **Both existing page branches are full replacements:** Current organizer stub has "Your turnout is live!" banner; current public stub has "Full details coming soon." Delete all existing JSX in both branches.
- ✅ **Organizer settled view scoped into this TDD:** Status card, share bar, tab nav are all specced here. TDD0006 builds the RSVPs list page the tab links to.

**Open:** None.

---

## Related Context

- **PRD:** prd0003-public-turnout-rsvp.md
- **Roadmap Phase:** MVP Week 4-5
- **Depends on:** TDD0001 (phone auth — live), TDD0002 (group/turnout creation — live)
- **Unlocks:** TDD0004 (SMS reminders — needs `Engagement` records to know who to remind), TDD0005 (check-in — updates `Engagement.status` to CHECKED_IN)
