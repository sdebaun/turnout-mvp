# TDD: Group & Turnout Creation Flow

**PRD:** prd0002-group-turnout-creation.md
**Status:** Ready for Implementation
**Last Updated:** 2026-02-20

## Context

_What I found:_

- **Vision alignment:** "It's hard for us to move together... The gap between 'I should do something' and 'there's a shareable link people can RSVP to' is where organizing dies." This feature is the gateway — zero to shareable link in under 2 minutes.
- **Roadmap phase:** MVP Week 2-3, second initiative. Depends on TDD0001 (phone identity, shipped). Drives "Turnouts successfully created and shared."
- **Architecture constraints:** Next.js App Router, Server Components + Server Actions, Prisma + Postgres (Neon), SST on AWS. TypeScript throughout. Server Actions over API routes. `neverthrow` for error handling.
- **TDD0001 contract:** Auth primitives are live. Reuse `checkPhoneAction`, `sendOTPAction`, `signInAction`, `getUser()`, `AuthModal`, `OTPInputForm`. Do NOT reimplement auth — compose on top of it.
- **Future-proofing (from PRD):** Schema should support future: multiple opportunities per turnout, group branding (logo/colors), recurring turnouts. Add nullable columns now; don't build the UI.

---

## Overview

**Problem:** First-time organizers (Bob, Thursday night, two beers, pissed about a gravel mine) need to go from zero to "shareable link my friends can RSVP to" in under 2 minutes or they close the tab.

**Solution:** Single-page form (vision → action → identity), phone verification only after the user has invested in the form, then atomic creation of Group + Turnout + default Opportunity in one transaction. Authenticated users skip the phone step entirely.

**Scope:**

- ✅ `/organize` page — single-page creation form
- ✅ Group + Turnout + default Opportunity created atomically after auth
- ✅ Google Places Autocomplete for location (with plain-text fallback)
- ✅ `/groups/[groupId]` — minimal organizer view showing shareable link post-creation
- ✅ Authenticated users skip OTP (they're already verified)
- ❌ No AI-generated group name suggestions (Bob types it himself)
- ❌ No public group pages (groups are internal; turnout pages are public, prd0003)
- ❌ No multiple opportunities (one default "Show Up" created automatically)
- ❌ No group branding UI (nullable DB fields added for future use; no UI)
- ❌ No draft mode (live immediately after OTP)

---

## Components

**What this touches:**

- [x] Database (Prisma schema: Group, GroupOrganizer, Location, Turnout, Opportunity)
- [x] Library functions (`lib/groups/`)
- [x] Server Actions (`apps/web/app/organize/actions.ts`)
- [x] SST config (add `GoogleMapsApiKey` secret and `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`)
- [x] Frontend — new page `/organize` with creation form
- [x] Frontend — new page `/groups/[groupId]` minimal organizer view
- [x] Frontend — reuse `AuthModal` / `OTPInputForm` from TDD0001
- [ ] Background jobs (none for this feature)

---

## Human Prerequisites

**Before the agent team can build the location field, a human must:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable **Maps JavaScript API** and **Places API** for the project
3. Create an API key restricted to the production domain (`turnout.network`) and any staging domains
4. Run: `sst secret set GoogleMapsApiKey "YOUR_KEY_HERE" --stage sdebaun`
5. Run: `sst secret set GoogleMapsApiKey "YOUR_KEY_HERE" --stage prod`

**If the key is not set:** The location field degrades gracefully to a plain text input. The turnout can still be created. Participants won't get "Get Directions" (no lat/lng). See Graceful Degradation section.

---

## Database Schema

### New Prisma Models

```prisma
enum LocationType {
  PHYSICAL
  VIRTUAL
}

// Reusable location entity. Shared between Turnout.primaryLocation and
// Opportunity.meetingLocation so the same venue can be referenced
// without duplicating data.
model Location {
  id               String       @id @default(cuid())
  name             String       // Display name: "Joe's Coffee", "Zoom Room"
  locationType     LocationType @default(PHYSICAL)

  // Physical location fields (populated by Google Places Autocomplete)
  formattedAddress String?      // Full address from Google Places
  lat              Float?       // Latitude — required for "Get Directions" links
  lng              Float?       // Longitude
  placeId          String?      // Google Places ID (future: refresh stale addresses)

  // Virtual location fields (future: online turnouts)
  meetingUrl       String?

  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  // Relations
  turnoutsAsPrimary Turnout[]   @relation("TurnoutPrimaryLocation")
  opportunities    Opportunity[] @relation("OpportunityMeetingLocation")
}

model Group {
  id      String @id @default(cuid())
  name    String // "Save Willow Creek"
  mission String // "Stop the gravel mine from destroying willow creek"

  // Nullable branding fields — schema ready for Next phase, no MVP UI
  logoUrl        String?
  primaryColor   String?
  secondaryColor String?
  about          String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  organizers GroupOrganizer[]
  turnouts   Turnout[]
}

// Join table: which users are organizers of which groups
model GroupOrganizer {
  id      String @id @default(cuid())
  groupId String
  userId  String
  group   Group  @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user    User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  joinedAt DateTime @default(now())

  @@unique([groupId, userId])
  @@index([groupId])
  @@index([userId])
}

model Turnout {
  id          String  @id @default(cuid())
  slug        String  @unique // Short URL-safe ID (nanoid, 8 chars): used in /t/[slug]
  title       String  // "First Planning Meeting"
  description String? // Optional longer description

  groupId           String
  group             Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)

  primaryLocationId String
  primaryLocation   Location @relation("TurnoutPrimaryLocation", fields: [primaryLocationId], references: [id])

  startsAt DateTime // UTC. Converted from organizer's local time on submission.

  // Nullable for future recurrence support. Always null in MVP.
  recurrenceRule String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  opportunities Opportunity[]

  @@index([groupId])
  @@index([slug])
  @@index([startsAt])
}

// A specific way to participate in a turnout. MVP always creates one per turnout:
// the default "Show Up" opportunity with no location/time overrides.
// Future: "Street Medic (meet at Main & 5th, 1:30pm)" with its own location + time.
model Opportunity {
  id       String  @id @default(cuid())
  turnoutId String
  turnout  Turnout @relation(fields: [turnoutId], references: [id], onDelete: Cascade)

  name        String  // "Show Up" (default)
  description String? // Optional role description

  // Overrides for future multi-opportunity turnouts.
  // null = inherit from parent Turnout. Always null in MVP.
  meetingLocationId String?
  meetingLocation   Location? @relation("OpportunityMeetingLocation", fields: [meetingLocationId], references: [id])
  meetingTime       DateTime? // null = use turnout's startsAt

  capacity Int? // null = unlimited

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([turnoutId])
}
```

### Changes to Existing Models

Add `groupOrganizers` back-relation to `User`:

```prisma
model User {
  // ... existing fields ...
  groupOrganizers GroupOrganizer[]  // ← add this line
}
```

### Migration Notes

- **All new tables.** No existing data is touched. Safe to deploy without downtime.
- Run `pnpm db:migrate` and enter `group-turnout-creation` when prompted for the migration name.
- **`nanoid` must be installed before running the migration** (the library is needed to generate slugs at runtime, not in the migration itself — the migration just adds the `slug` column with no default; application code generates the slug).

---

## SST Config Changes

### Add `GoogleMapsApiKey` Secret

In `sst.config.ts`, alongside the existing secrets:

```typescript
const googleMapsApiKey = new sst.Secret("GoogleMapsApiKey")
```

Link it to the Next.js app and expose as a public env var (client-side key, safe to expose):

```typescript
const web = new sst.aws.Nextjs("TurnoutWeb", {
  // ... existing config ...
  link: [
    // ... existing links ...
    googleMapsApiKey,
  ],
  environment: {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: googleMapsApiKey.value,
  },
})
```

**If the secret is not set:** `process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` will be `undefined`. The location component checks for this and renders a plain text input instead of the Places widget.

---

## Server Actions

File: `apps/web/app/organize/actions.ts`

All marked `'use server'`. Thin orchestrators — business logic lives in `lib/groups/`.

---

### `createGroupWithTurnoutAction(data)`

**Who calls this:** The creation form after authentication (either from `signInAction` success or when the user was already authenticated on page load).

**Auth required:** Yes — reads session via `getUser()`. Returns `{ error }` if no session.

**Input:**
```typescript
type CreateGroupInput = {
  groupName: string            // max 100 chars
  mission: string              // max 500 chars
  turnoutTitle: string         // max 100 chars
  description?: string         // max 1000 chars
  locationName: string         // display name (e.g., "Joe's Coffee")
  locationFormattedAddress?: string  // from Google Places
  locationLat?: number
  locationLng?: number
  locationPlaceId?: string
  turnoutDate: string          // "YYYY-MM-DD" (local date)
  turnoutTime: string          // "HH:MM" (local time, 24h)
  turnoutTimezoneOffset: number // browser's UTC offset in minutes (Date.getTimezoneOffset())
}
```

**Output:**
```typescript
{ success: true; groupId: string; turnoutSlug: string }
| { error: string }
```

**Steps:**

1. `getUser()` → return `{ error: 'Not authenticated' }` if null
2. Validate all required fields (groupName, mission, turnoutTitle, locationName, turnoutDate, turnoutTime)
3. Convert date + time + timezone offset to UTC `Date` object
4. Validate `startsAt` is in the future → return `{ error: 'Turnout date must be in the future' }` if not
5. Call `createGroupWithTurnout(user.id, validatedData)` from `lib/groups/`
6. If `err`: return `{ error: message }`
7. If `ok`: return `{ success: true, groupId, turnoutSlug }`

---

## Library Functions

**File:** `lib/groups/index.ts` (barrel), `lib/groups/groups.ts` (implementation)

**File location convention:** Follows the same pattern as `lib/auth/` — root `lib/` directory, not `apps/web/lib/`. Import via `@/lib/groups/`.

---

### `createGroupWithTurnout(userId, data)` → `ResultAsync<{ groupId, turnoutId, turnoutSlug }, string>`

The core atomic creation function. Runs everything in a single Prisma transaction so partial failures leave no orphan records.

**What it creates (in order, within transaction):**

1. `Location` record (with name and optional lat/lng/placeId/formattedAddress)
2. `Group` record (name + mission)
3. `GroupOrganizer` join record (groupId + userId)
4. `Turnout` record (title, description, groupId, primaryLocationId, startsAt, slug)
5. `Opportunity` record (name: "Show Up", turnoutId, no location/time overrides)

**Slug generation:** Before the transaction, generate a slug via `generateTurnoutSlug()`. If a `UniqueConstraintError` occurs on the `slug` field, retry with a new slug (up to 3 attempts; fail with `err(...)` after that).

**Returns:** `ok({ groupId, turnoutId, turnoutSlug })` or `err(errorMessage)`.

---

### `generateTurnoutSlug()` → `string`

Generates an 8-character URL-safe slug using `nanoid`. Called outside the transaction so retries are cheap.

```typescript
import { customAlphabet } from 'nanoid'
// URL-safe alphabet, no ambiguous chars (0/O, 1/l/I)
const nanoid = customAlphabet('23456789abcdefghjkmnpqrstuvwxyz', 8)
export function generateTurnoutSlug(): string {
  return nanoid()
}
```

---

### `getGroupForOrganizer(groupId, userId)` → `Promise<GroupWithTurnouts | null>`

Fetches a group with its turnouts, but only if the user is an organizer. Returns `null` if not found or user is not an organizer. Used by the organizer dashboard page.

**Includes:**
- `Group` fields
- `turnouts` array (each with `primaryLocation` and `opportunities`)
- Confirms `GroupOrganizer` record exists for this userId

---

## Frontend Components

### Pages/Routes

| Route | File | Type | Auth |
|-------|------|------|------|
| `/organize` | `apps/web/app/organize/page.tsx` | Server Component (wrapper) | No — checked at runtime |
| `/groups/[groupId]` | `apps/web/app/groups/[groupId]/page.tsx` | Server Component | Yes — redirects to `/organize` if not auth'd |

---

### `/organize` — Creation Form Page

**`apps/web/app/organize/page.tsx`** — Server Component:

```tsx
export default async function OrganizePage() {
  const user = await getUser()
  return <OrganizeForm existingUser={user} />
}
```

**`apps/web/app/organize/components/organize-form.tsx`** — Client Component:

The single-page creation form. Manages all state locally. No page navigation until creation succeeds.

**Form sections (in psychological order):**

**Section 1 — Vision ("What are you organizing for?")**
- `mission` — Textarea. Required. Placeholder: "Stop the gravel mine from destroying Willow Creek." Max 500 chars.
- `groupName` — Text input. Required. Placeholder: "Save Willow Creek." Max 100 chars.

**Section 2 — Action ("Your First Turnout")**
- `turnoutTitle` — Text input. Pre-filled: "First Planning Meeting". Max 100 chars.
- `description` — Textarea. Optional. Max 1000 chars.
- `location` — `LocationInput` component (see below). Required.
- `turnoutDate` — Date picker. Required. Must be today or future.
- `turnoutTime` — Time picker. Required.

**Section 3 — Identity ("Who are you?")**
- Shown only when `existingUser` prop is `null` (unauthenticated)
- `displayName` — Text input. Pre-filled with random name (adjective + animal, rerollable). Max 50 chars.
- `phone` — Phone number input. Required for unauthenticated users.
- When `existingUser` is not null: Section 3 is hidden. The authenticated user's existing identity is used.

**Submission flow:**

For **unauthenticated** users:
1. User clicks "Create Turnout"
2. Client validates all fields → show inline errors if invalid
3. Call `sendOTPAction(phone)` → if error, show error toast
4. Show OTP modal (reuse `OTPInputForm` from TDD0001, no `AuthModal` wrapper needed — just the OTP step)
5. User enters code → call `signInAction(phone, code, displayName)`
   - On error: show error in OTP modal, user can retry or resend
   - On success: call `createGroupWithTurnoutAction(formData)` → redirect to `/groups/[groupId]`

For **authenticated** users:
1. User clicks "Create Turnout"
2. Client validates all fields → show inline errors if invalid
3. Call `createGroupWithTurnoutAction(formData)` directly → redirect to `/groups/[groupId]`

**Error states:**
- Validation errors: inline below each field
- OTP errors: displayed within the OTP input area
- Server errors from `createGroupWithTurnoutAction`: toast or error banner above submit button

---

### `LocationInput` Component

**`apps/web/app/organize/components/location-input.tsx`** — Client Component

Renders one of two variants based on `process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`:

**Variant A — Google Places Autocomplete (key present):**
- Uses `@vis.gl/react-google-maps` library to load Maps JS API
- Renders a `PlaceAutocompleteClassic` input (or custom `usePlacesService` hook)
- On place selection: populates hidden form state with `{ name, formattedAddress, lat, lng, placeId }`
- The visible input shows the selected place name
- Allow freeform entry (don't force the user to select from dropdown — they might type an address manually)

**Variant B — Plain text fallback (no key):**
- Simple text input
- Populates `{ name: textValue }` with no lat/lng/placeId
- Shows notice: "📍 Enter a full address so attendees can get directions."

**Props:**
```typescript
type LocationInputProps = {
  value: LocationState
  onChange: (location: LocationState) => void
}

type LocationState = {
  name: string
  formattedAddress?: string
  lat?: number
  lng?: number
  placeId?: string
}
```

**Required package:** `pnpm add @vis.gl/react-google-maps`

---

### `/groups/[groupId]` — Minimal Organizer View

**`apps/web/app/groups/[groupId]/page.tsx`** — Server Component:

Minimal "your turnout is live" view. This is a thin precursor to the full group dashboard (prd0006) — it will be expanded later. For now, it gives Bob what he needs: the shareable link and confirmation that it worked.

**Auth:** `getUser()` → if null, `redirect('/organize')`. If not an organizer of this group, `notFound()`.

**What it shows:**
1. Group name + mission (confirmation of what was just created)
2. Turnout title, date, time, location name
3. **Shareable link prominently**: `https://turnout.network/t/[slug]` (or the CloudFront URL in dev)
4. Copy button (copies URL to clipboard)
5. Web Share button (uses `navigator.share` API on mobile if available)
6. RSVP count: "0 people have RSVPd" (hardcoded for now; real count comes with prd0003)
7. Note: "Share this link with your group chat to get RSVPs"

**URL for shareable link:** The turnout's public URL will be `/t/[slug]` when prd0003 ships that route. Show this URL in the dashboard even though clicking it returns 404 until prd0003 is deployed. Bob copies and pastes the link — the page will exist by the time participants try to access it.

Alternatively: if you want to avoid showing a broken link, show the URL in a read-only "copy only" input that doesn't hyperlink it. TDD0003 will add the actual route.

---

## Auth & Permissions

**`/organize` page:** Publicly accessible. Auth is optional at page load. The form itself handles auth inline (OTP step) before creation.

**`createGroupWithTurnoutAction`:** Requires authentication. Validates session on every call. If the user's session expires between form fill and submission, they get an error and must re-authenticate.

**`/groups/[groupId]` page:** Requires authentication. Requires the user to be a `GroupOrganizer` for the specified group. Unauthorized access returns 404 (not 403 — don't leak group existence to non-organizers).

**Who can create groups:** Any authenticated user. There are no role checks for group creation — anyone with a valid phone can become an organizer.

---

## Edge Cases & Error Handling

| Scenario | Expected Behavior | Message |
|----------|-----------------|---------|
| Required field missing | Inline validation error | "[Field] is required" |
| Turnout date in the past | Inline error on date field | "Turnout must be in the future" |
| Group name > 100 chars | Inline validation error | "Group name must be 100 characters or less" |
| OTP wrong on creation attempt | OTP input shows error, stays on OTP step | "Invalid verification code" |
| OTP expired during form fill | OTP input shows error, offer resend | "This code has expired. Request a new one." |
| `createGroupWithTurnoutAction` called without session | Return `{ error }` | "Not authenticated" |
| Slug collision on `Turnout` (nanoid collision) | Retry up to 3 times, then error | "Failed to create turnout. Please try again." |
| Google Places API fails to load | Degrade to plain text input | No error shown; plain input renders silently |
| User navigates away during OTP step | Form state is lost (no persistence). User must start over. | — (accepted MVP limitation) |

**Validation rules:**

- `mission`: required, 1–500 chars
- `groupName`: required, 1–100 chars
- `turnoutTitle`: required, 1–100 chars
- `description`: optional, max 1000 chars
- `locationName`: required, 1–200 chars (coordinates are optional)
- `turnoutDate`: required, must be today or future
- `turnoutTime`: required, valid HH:MM
- `displayName`: 1–50 chars, alphanumeric + spaces/hyphens/underscores (inherits TDD0001 validation)
- `phone`: E.164 format (inherits TDD0001 validation)

---

## Date/Timezone Handling

**MVP approach:** Accept organizer's local time; don't require explicit timezone selection.

- Form collects `date` (YYYY-MM-DD) and `time` (HH:MM) as strings
- Client submits these along with `timezoneOffset` = `new Date().getTimezoneOffset()` (minutes behind UTC, negative for UTC+)
- Server reconstructs UTC datetime: `new Date(date + 'T' + time + offsetString)`
- Stored in `Turnout.startsAt` as UTC
- Displayed on organizer page and eventually turnout page in local time via `toLocaleString()`

**Limitation acknowledged:** If organizer and participants are in different timezones, the display time is wrong for participants. Acceptable for MVP (local organizing is local). Add explicit timezone selection in "Next" phase.

---

## Testing Strategy

### Tier 1: Unit Tests (Vitest) — Mocked External Dependencies

**File:** `lib/groups/groups.test.ts`

Database: Runs against dev Neon DB. Truncate relevant tables in `beforeEach` in this order: `Opportunity`, `Turnout`, `GroupOrganizer`, `Group`, `Location` (and existing: `Session`, `Credential`, `User`).

**Required tests:**

`createGroupWithTurnout`:
- Creates all 5 records (Location, Group, GroupOrganizer, Turnout, Opportunity) in a single call
- Returns `ok({ groupId, turnoutId, turnoutSlug })`
- `turnoutSlug` is 8 chars matching `/^[23456789a-z]+$/`
- `GroupOrganizer` links the provided `userId` to the created `Group`
- Default `Opportunity` has name "Show Up", no meetingLocation, no meetingTime, no capacity
- Rolls back all records if any step fails (simulate by temporarily adding a `throw` after Location creation — verify no Location record persists)
- Handles slug collision: if nanoid generates a colliding slug, retries and succeeds (test by mocking nanoid to return a colliding value on first call, then a valid value on second call)

`getGroupForOrganizer`:
- Returns group with turnouts when userId is an organizer
- Returns `null` when userId is not an organizer of the group
- Returns `null` when groupId does not exist

`generateTurnoutSlug`:
- Returns string of length 8
- Contains only characters from the defined alphabet
- Two calls return different values (probabilistic; just verify they're not equal)

### Tier 2: E2E Tests (Playwright, dev) — Full Flow

**File:** `tests/e2e/tdd0002-group-creation/group-creation.spec.ts`

Uses `TEST_OTP_BYPASS=true` approach inherited from TDD0001.

**Prerequisite:** Cleanup API endpoint needs to be extended to also truncate `Opportunity`, `Turnout`, `GroupOrganizer`, `Group`, `Location` tables.

**Test 1: Full creation flow (unauthenticated)**
1. Navigate to `/organize`
2. Fill in mission textarea
3. Fill in group name
4. Fill in turnout title (or accept pre-fill)
5. Fill in location (plain text — no Google Maps in test env)
6. Select a future date and time
7. Fill in display name (or accept pre-fill)
8. Fill in phone: `+12025550110` (new test number reserved for this feature)
9. Click "Create Turnout"
10. OTP modal appears — enter `000000` (bypass code)
11. Assert: redirected to `/groups/[groupId]`
12. Assert: group name visible on page
13. Assert: shareable link visible containing `/t/`
14. Assert: "0 people have RSVPd" (or similar) visible

**Test 2: Creation as authenticated user**
1. Call seed endpoint to create a user + session for `+12025550111`
2. Set session cookie
3. Navigate to `/organize`
4. Assert: phone and displayName fields NOT visible (user already authenticated)
5. Fill in form fields (mission, groupName, turnoutTitle, location, date, time)
6. Click "Create Turnout"
7. Assert: redirected to `/groups/[groupId]` immediately (no OTP modal)
8. Assert: shareable link visible

**Test 3: Validation errors**
1. Navigate to `/organize`
2. Click "Create Turnout" without filling anything
3. Assert: error messages visible for required fields
4. Assert: no OTP modal
5. Assert: still on `/organize`

**Test 4: Past date rejected**
1. Navigate to `/organize`
2. Fill all fields with a past date
3. Click "Create Turnout"
4. Assert: error on date field "Turnout must be in the future"

---

## NPM Dependencies

```bash
pnpm add nanoid @vis.gl/react-google-maps
```

**`nanoid`:** URL-safe unique ID generation for turnout slugs. Use `customAlphabet` to exclude ambiguous characters (0/O, 1/l/I).

**`@vis.gl/react-google-maps`:** Official Google Maps React bindings. Handles script loading and provides `usePlacesService` and `PlaceAutocompleteClassic` components.

**Verify `nanoid` version compatibility:** If `nanoid@4+` causes ESM/CJS issues with the test runner, pin to `nanoid@3` which has CJS support. Check `vitest.config.ts` for any `ssr: { external }` exclusions that may be needed.

---

## Open Questions / Decisions Made

**Made:**
- ✅ **Slug format:** 8-char nanoid with unambiguous alphabet. Not sequential IDs (guessable). Not UUID (too long for URLs).
- ✅ **Turnout URL pattern:** `/t/[slug]` — short and memorable. Established here even though the route is built in TDD0003.
- ✅ **Single-page form:** Not multi-step wizard. PRD endorses this; simplicity wins for MVP.
- ✅ **No AI group name suggestion:** Bob types the group name himself. Placeholder text guides him. AI suggestion deferred.
- ✅ **Timezone handling:** Capture browser timezone offset, convert to UTC on submission. Accept known limitation that cross-timezone display is wrong for MVP.
- ✅ **Authenticated users skip OTP:** Session-verified users don't re-enter phone. Security is unchanged — their phone was verified when they first signed in.
- ✅ **No draft mode:** Turnout is live the moment OTP is confirmed. Simplicity wins.
- ✅ **Post-creation page:** Minimal organizer view at `/groups/[groupId]`, not a dedicated confirmation page. This evolves into the full dashboard in TDD0006.

**Still open:**
- ⚠️ **Google Maps key status:** Human must provision before location autocomplete works. See Human Prerequisites section.
- ⚠️ **`@vis.gl/react-google-maps` vs. custom hook:** If the library causes issues in the App Router (e.g., SSR hydration mismatches), fall back to loading the Maps script manually via a `<Script>` tag in layout and using the raw `google.maps.places.Autocomplete` API from a `useEffect`.

---

## Related Context

- **PRD:** prd0002-group-turnout-creation.md
- **Roadmap Phase:** MVP Week 2-3
- **Depends on:** TDD0001 (phone identity — shipped and live)
- **Unlocks:** TDD0003 (public turnout pages + RSVP — needs `/t/[slug]` route and Turnout data)
- **Eventual expansion:** TDD0006 (group dashboard — `/groups/[groupId]` will be fully built out)
