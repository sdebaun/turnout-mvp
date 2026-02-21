# TDD: Group & Turnout Creation Flow

**PRD:** prd0002-group-turnout-creation.md
**Status:** Ready for Implementation
**Last Updated:** 2026-02-20 (revised after 5-reviewer team review + follow-up: schema fixes, timezone DST bug, stub route, E2E cleanup redesign, UX gaps addressed; auth flow switched to AuthModal-on-submit; plain-text location fallback removed; GroupWithTurnouts and getGroupForOrganizer replaced with minimal getGroupConfirmation; OTPInputForm prop type change clarified for AuthModal refactor)

## Context

_What I found:_

- **Vision alignment:** "It's hard for us to move together... The gap between 'I should do something' and 'there's a shareable link people can RSVP to' is where organizing dies." This feature is the gateway — zero to shareable link in under 2 minutes.
- **Roadmap phase:** MVP Week 2-3, second initiative. Depends on TDD0001 (phone identity, shipped). Drives "Turnouts successfully created and shared."
- **Architecture constraints:** Next.js App Router, Server Components + Server Actions, Prisma + Postgres (Neon), SST on AWS. TypeScript throughout. Server Actions over API routes. `neverthrow` for error handling.
- **TDD0001 contract:** Auth primitives are live. Reuse `checkPhoneAction`, `sendOTPAction`, `signInAction`, `getUser()`, `AuthModal`, `OTPInputForm`. Do NOT reimplement auth — compose on top of it.
- **Future-proofing (from PRD):** Schema supports future: multiple opportunities per turnout, group branding (logo/colors), recurring turnouts. Add nullable columns now; don't build the UI.

---

## Overview

**Problem:** First-time organizers (Bob, Thursday night, two beers, pissed about a gravel mine) need to go from zero to "shareable link my friends can RSVP to" in under 2 minutes or they close the tab.

**Solution:** Single-page form collecting only turnout data (vision → action). If the user isn't authenticated when they submit, the full `AuthModal` fires — it handles new vs. returning user, display name, and OTP exactly as designed in TDD0001. After auth, creation proceeds. Authenticated users skip auth entirely. Group + Turnout + default Opportunity created atomically in one transaction.

**Scope:**

- ✅ `/organize` page — single-page creation form with reassurance copy
- ✅ Group + Turnout + default Opportunity created atomically after auth
- ✅ Google Places Autocomplete for location (required; no plain-text fallback)
- ✅ `/t/[slug]` — post-creation destination; shows invite UI for organizers, holding message for everyone else
- ✅ Authenticated users skip OTP (already verified)
- ❌ No AI-generated group name suggestions (Bob types it himself)
- ❌ No `/groups/[groupId]` organizer dashboard (deferred to TDD0006)
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
- [x] Frontend — new page `/t/[slug]` (post-creation destination; organizer invite UI + public holding message)
- [x] Frontend — refactor `AuthModal` from TDD0001 (remove implicit `router.refresh()`, expose `onSuccess` callback; update existing callers)
- [ ] Background jobs (none for this feature)

---

## Human Prerequisites

**Before the agent team can build the location field, a human must:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable **Maps JavaScript API** and **Places API (New)**
3. Create an API key restricted to the production domain (`turnout.network`) and any staging domains
4. Run: `sst secret set GoogleMapsApiKey "YOUR_KEY_HERE" --stage sdebaun`
5. Run: `sst secret set GoogleMapsApiKey "YOUR_KEY_HERE" --stage prod`

**If the key is not set or fails to load:** The `LocationInput` component renders an error state: "Location search is unavailable — please try again or contact support." The form cannot be submitted without a valid location. This is correct behavior: if Places doesn't load, something is genuinely broken (missing key or network failure) and should be surfaced, not silently degraded.

---

## Database Schema

### New Enums

```prisma
enum LocationType {
  PHYSICAL
  VIRTUAL
}

// Turnout lifecycle. UPCOMING is the only status used in MVP — CANCELED and
// COMPLETED exist to prevent a painful migration when TDD0005/TDD0006 need them.
enum TurnoutStatus {
  UPCOMING
  CANCELED
  COMPLETED
}
```

### New Prisma Models

```prisma
// Reusable location entity. Referenced by Turnout.primaryLocation and
// (in future) Opportunity.meetingLocation.
// Note: MVP always creates a new Location per turnout — no lookup-or-reuse
// pattern yet. "Reusable" refers to the schema capability, not current behavior.
model Location {
  id               String       @id @default(cuid())
  name             String       // Display name: "Joe's Coffee", "Zoom Room"
  locationType     LocationType @default(PHYSICAL)

  // Physical location fields — populated by Google Places Autocomplete.
  // Nullable because VIRTUAL locations don't have coordinates.
  // For PHYSICAL locations, all four should always be set — Places is required.
  formattedAddress String?
  lat              Float?       // Required for "Get Directions" links (prd0003/prd0005)
  lng              Float?
  placeId          String?      // Google Places ID

  // Virtual location fields (future: online turnouts)
  meetingUrl       String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  turnoutsAsPrimary Turnout[]    @relation("TurnoutPrimaryLocation")
  opportunities     Opportunity[] @relation("OpportunityMeetingLocation")
}

model Group {
  id      String @id @default(cuid())
  name    String // "Save Willow Creek"
  mission String // "Stop the gravel mine from destroying Willow Creek"

  // Nullable branding fields — schema ready for Next phase, no MVP UI.
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

// Join table: which users are organizers of which groups.
// Uses compound primary key — the identity IS (groupId, userId).
model GroupOrganizer {
  groupId String
  userId  String
  group   Group  @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user    User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  joinedAt DateTime @default(now())

  @@id([groupId, userId])
  @@index([groupId])
  @@index([userId])
}

model Turnout {
  id          String        @id @default(cuid())
  slug        String        @unique // 8-char nanoid; used in /t/[slug]
  title       String        // "First Planning Meeting"
  description String?

  groupId String
  group   Group  @relation(fields: [groupId], references: [id], onDelete: Cascade)

  primaryLocationId String
  primaryLocation   Location @relation("TurnoutPrimaryLocation", fields: [primaryLocationId], references: [id])

  // Who created this turnout. Nullable for safe migration (no existing data),
  // but always set in practice. Needed for prd0007 (co-organizer) to track
  // which group organizer owns which turnout.
  createdByUserId String?
  createdByUser   User?   @relation(fields: [createdByUserId], references: [id])

  startsAt DateTime         // UTC. Converted from organizer's local time via IANA timezone.
  endsAt   DateTime?        // Nullable. TDD0003 will default to startsAt + 2h for .ics files.

  status TurnoutStatus @default(UPCOMING)

  // Always null in MVP. Exists to prevent schema migration when recurrence ships.
  recurrenceRule String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  opportunities Opportunity[]

  @@index([groupId])
  @@index([startsAt])
}

// A specific way to participate in a turnout.
// MVP creates one per turnout: the default "Show Up" opportunity
// with no overrides. Future: "Street Medic (meet at Main & 5th, 1:30pm)".
model Opportunity {
  id        String  @id @default(cuid())
  turnoutId String
  turnout   Turnout @relation(fields: [turnoutId], references: [id], onDelete: Cascade)

  name        String  // "Show Up"
  description String?

  // Overrides — always null in MVP. Non-null when an opportunity has a
  // different location or time than its parent turnout.
  meetingLocationId String?
  meetingLocation   Location? @relation("OpportunityMeetingLocation", fields: [meetingLocationId], references: [id])
  meetingTime       DateTime?

  capacity Int? // null = unlimited

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([turnoutId])
}
```

### Changes to Existing Models

Add two back-relations to the `User` model: `groupOrganizers GroupOrganizer[]` and `turnoutsCreated Turnout[]` (the `createdByUser` back-relation).

### Migration Notes

- **All new tables + enum additions.** No alterations to existing columns. Neon handles `CREATE TABLE` and `CREATE TYPE` DDL without locking existing tables. Safe to deploy without downtime.
- Run `pnpm db:migrate` and enter `group-turnout-creation` when prompted.
- `nanoid` must be installed before deploy (runtime dependency for slug generation).
- `date-fns-tz` must be installed before deploy (runtime dependency for UTC conversion).

---

## SST Config Changes

### Add `GoogleMapsApiKey` Secret

Add `GoogleMapsApiKey` as an SST secret following the existing pattern in `sst.config.ts`. Link it to the Next.js app and expose as `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in the `environment` block.

**⚠️ `NEXT_PUBLIC_*` vars are inlined at build time.** Next.js bakes them into the client bundle during `next build`. SST resolves the secret value before the build runs — but if the secret is missing at deploy time, the client bundle will contain `undefined` and no amount of runtime secret-setting will fix it without a redeploy.

---

## Server Actions

File: `apps/web/app/organize/actions.ts`

All marked `'use server'`. Thin orchestrators — validation and type definitions live here, business logic lives in `lib/groups/`.

---

### Input Type

`CreateGroupWithTurnoutInput` lives in `apps/web/app/organize/actions.ts` (TDD0001 pattern: colocate validation with the action). Fields: `groupName`, `mission`, `turnoutTitle`, `description?`, `location: LocationData`, `turnoutDate` (YYYY-MM-DD), `turnoutTime` (HH:MM), `turnoutTimezone` (IANA name). No phone or displayName — auth is handled entirely by `AuthModal` before this action is ever called.

`LocationData` is defined here too (not in `lib/`) since it spans the client form → server action boundary: `{ name, formattedAddress?, lat?, lng?, placeId? }`.

---

### `createGroupWithTurnoutAction(data)`

**Auth required:** Yes — reads session via `getUser()`. Returns `{ error }` if no session. On success: `{ success: true, turnoutSlug }` — the caller redirects to `/t/[slug]`.

**Steps:**

1. `getUser()` → return `{ error: 'Not authenticated' }` if null
2. Validate all required fields (groupName, mission, turnoutTitle, location.name, turnoutDate, turnoutTime, turnoutTimezone)
3. Validate field lengths (see Edge Cases section)
4. Call `toUTCDate(turnoutDate, turnoutTime, turnoutTimezone)` → `Date`
5. Validate `startsAt` is in the future → return `{ error: 'Turnout date must be in the future' }` if not
6. Call `createGroupWithTurnout(user.id, { ...validatedData, startsAt })` from `lib/groups/`
7. If `err`: `logger.error({ userId: user.id, groupName, error }, 'Failed to create group/turnout')` → return `{ error: message }`
8. If `ok`: return `{ success: true, turnoutSlug }`

---

## Library Functions

**Files:** `lib/groups/groups.ts` (implementation), `lib/groups/date-utils.ts` (date helpers), `lib/groups/index.ts` (barrel)

**File location convention:** Root `lib/` directory, not `apps/web/lib/`. Import via `@/lib/groups/`.

---

### `lib/groups/date-utils.ts`

**`toUTCDate(date, time, timezone)`** → `Date`

One-liner using `fromZonedTime` from `date-fns-tz`. Takes the IANA timezone name (not an offset integer) so DST is handled correctly — an event on March 15 created on March 1 gets March 15's offset, not March 1's.

---

### `lib/groups/groups.ts`

#### `generateTurnoutSlug()` → `string`

8-char `customAlphabet` nanoid using `'23456789abcdefghjkmnpqrstuvwxyz'` — excludes 0/O/1/l/I to prevent misreads in shared URLs.

#### `createGroupWithTurnout(userId, data)` → `ResultAsync<{ groupId, turnoutId, turnoutSlug }, string>`

The core atomic creation function. All 5 records in a single Prisma transaction.

**Transaction order** (respects FK dependencies):
1. Create `Location`
2. Create `Group`
3. Create `GroupOrganizer` (groupId + userId)
4. Create `Turnout` (groupId, primaryLocationId, createdByUserId, slug)
5. Create `Opportunity` (turnoutId, name: "Show Up")

**Slug collision handling:** Generate slug via `generateTurnoutSlug()` before the transaction. If `prisma.$transaction` throws a `PrismaClientKnownRequestError` with code `P2002` (unique constraint) on the `slug` field, retry with a new slug. Up to 3 attempts; return `err(...)` after that.

Returns `ok({ groupId, turnoutId, turnoutSlug })` or `err(errorMessage)`.

---

## Frontend Components

### Pages/Routes

| Route | File | Type | Auth |
|-------|------|------|------|
| `/organize` | `apps/web/app/organize/page.tsx` | Server Component (wrapper) | No — checked at runtime |
| `/t/[slug]` | `apps/web/app/t/[slug]/page.tsx` | Server Component | No — public; organizer view shown when auth'd |

---

### `/organize` — Creation Form Page

**`apps/web/app/organize/page.tsx`** — Server Component. Gets the current user (if any) via `getUser()` and passes it to `OrganizeForm` — this lets the form know whether to skip the AuthModal entirely.

**`apps/web/app/organize/components/organize-form.tsx`** — Client Component

Manages all form state locally. No page navigation until creation succeeds.

#### Page-level copy (load-bearing UX, not decoration)

The PRD user story begins: *"The platform starts with the helpful hint of 'don't think too hard about this, you can change it later.'"* This reassurance is not optional copy — it directly affects completion rates for first-time organizers. The form must include:

- **Page header:** Something like "You're starting something." or "Let's get people moving."
- **Subheader/intro:** "Don't think too hard about this — you can change everything later."
- **User-facing section headers** that explain without jargon:
  - Section 1: "What are you organizing for?"
  - Section 2: "Your first turnout"

#### Form sections (in psychological order):

The form collects only turnout data. Identity (phone, display name) is handled by `AuthModal` after submission if needed — it is never in this form.

**Section 1 — "What are you organizing for?"**
- `mission` — Textarea. Required. Placeholder: "Stop the gravel mine from destroying Willow Creek." Max 500 chars. Helper text: "Describe what you're fighting for or building toward."
- `groupName` — Text input. Required. Placeholder: "Save Willow Creek." Max 100 chars. Helper text: "Give your effort a name."

**Section 2 — "Your first turnout"**
- `turnoutTitle` — Text input. Pre-filled: "First Planning Meeting". Max 100 chars.
- `description` — Textarea. Optional. Max 1000 chars. Placeholder: "What should people expect? What will you decide or work on together?"
- `location` — `LocationInput` component (see below). Required.
- `turnoutDate` — `<input type="date">`. Required. Use native HTML input. Do NOT use a custom picker library — native inputs invoke the OS-level date UI on mobile, which is dramatically faster for Bob on his Android. Must be today or future (set `min` attribute to today's date).
- `turnoutTime` — `<input type="time">`. Required. Native HTML input.

#### AuthModal refactor: remove implicit `router.refresh()`, expose `onSuccess`

This is a small refactor of TDD0001's `AuthModal` that ships with TDD0002.

**The problem:** `AuthModal` currently calls `router.refresh()` internally on success. That hardcoded side-effect makes it impossible for callers to chain their own behavior (like creating a group) after auth completes — and it means the modal has opinions about what happens next.

**The fix:** Remove `router.refresh()` from inside `AuthModal`. Add an optional `onSuccess?: (result: { isNewUser: boolean }) => void` prop. When `signInAction` succeeds, call `onSuccess?.({ isNewUser })` and close. That's it. Callers that want a refresh pass `onSuccess: () => router.refresh()`.

**`OTPInputForm` type change required:** `signInAction` already returns `{ success: true, isNewUser: boolean }`. The current `OTPInputForm` discards that value — `onSuccess: () => void` and the call is `onSuccess()`. This needs to change:
- `OTPInputForm.onSuccess` type: `() => void` → `(result: { isNewUser: boolean }) => void`
- Inside `OTPInputForm`: extract `result.isNewUser` from `signInAction`'s return, call `onSuccess({ isNewUser: result.isNewUser })`
- `AuthModal.handleAuthSuccess` receives `{ isNewUser }` from `OTPInputForm` and passes it through to its own `onSuccess?.({ isNewUser })`

**Callers that need updating:** Any existing usage that relied on the implicit refresh (e.g., the home page login flow from TDD0001) must now pass an explicit `onSuccess: () => router.refresh()` to maintain the same behavior. The `onSuccess` signature change is backwards-compatible for callers that ignore the `isNewUser` argument. Identify all callers during implementation and update them.

#### Submission flow

**Unauthenticated:**
1. User clicks "Create Turnout"
2. Disable button, show loading state
3. Client validates all fields — if errors, scroll to first error field and focus it, re-enable button
4. Capture timezone: `Intl.DateTimeFormat().resolvedOptions().timeZone`
5. Open `AuthModal` with context-specific copy:
   - `title`: "Before we make this official..."
   - `body`: "We need a way to reach you — your phone number is how we'll send reminders and keep you in the loop."
   - `onSuccess`: async callback that calls `createGroupWithTurnoutAction(formData)` then redirects
6. AuthModal handles the full phone → displayName (if new) → OTP flow exactly as TDD0001 designed it
7. On auth success: `onSuccess` fires → `createGroupWithTurnoutAction(formData)` → `router.push('/t/[slug]')`
8. On creation error: close modal, show error banner above submit button, re-enable button

**Authenticated:**
1. User clicks "Create Turnout"
2. Disable button, show loading state
3. Client validates → scroll to first error if any, re-enable button
4. Capture timezone
5. Call `createGroupWithTurnoutAction(formData)` directly — no modal
6. On success: `router.push('/t/[slug]')`
7. On error: show error banner, re-enable button

**Loading state requirements:**
- Button disabled and shows spinner or "Creating..." text during any async operation
- Double-submit prevention: button stays disabled until error (re-enables) or redirect
- While AuthModal is open and creation is in progress after OTP: show spinner state within the modal before closing and redirecting

---

### `LocationInput` Component

**`apps/web/app/organize/components/location-input.tsx`** — Client Component. Props: `value: LocationData`, `onChange: (location: LocationData) => void` (same `LocationData` type as actions.ts).

Uses Google Places Autocomplete. No plain-text fallback — if the script doesn't load, the form blocks with an error. Coordinates are required for "Get Directions" (prd0003) and geofenced check-in (prd0005). A turnout without coordinates is permanently broken; an error message is more honest than silently degrading. TBD location is a future feature.

**SSR/hydration guard:** Wrap in `dynamic(..., { ssr: false })` — Maps JS API needs `window`. Use a disabled placeholder input as the `loading` fallback so the form layout doesn't shift.

**Use `PlaceAutocompleteClassic`** (not raw `usePlacesService`). It handles session tokens automatically, bundling all keystrokes into one billed session (~$0.017 vs ~$2.83/1000 requests without tokens).

**On script load failure:** Render an error state — "Location search is unavailable. Please refresh the page or contact support." Disable the submit button. Do not render a plain text input.

**On place selection:** Populate all `LocationData` fields from the `PlaceResult` — `name` from `place.name`, `formattedAddress` from `place.formatted_address`, `lat`/`lng` from `place.geometry.location`, `placeId` from `place.place_id`.

**On freeform entry (user types but doesn't select a suggestion):** Block form submission with an inline error: "Please select a location from the dropdown." A typed address with no geocoding is not acceptable — the whole point is to get verified coordinates.

---

### `/t/[slug]` — Turnout Page (Stub + Organizer Invite View)

**`apps/web/app/t/[slug]/page.tsx`** — Server Component. Calls `getTurnoutBySlug(slug)` → `notFound()` if null. Also calls `getUser()`. No auth required — public page.

`getTurnoutBySlug(slug)` in `lib/groups/groups.ts`: public lookup, returns turnout with group and primaryLocation included.

**Two views, same route:**

**Organizer view** (user is authenticated AND is a `GroupOrganizer` for this turnout's group):

1. **Celebration header:** "Your turnout is live!" — Bob just did something he's never done before. Acknowledge it.
2. Group name and mission, turnout title, date/time, location name
3. **Prewritten invite message** — the user story explicitly describes this. Generate from turnout data:

```
Hey! I'm organizing [turnoutTitle] for [groupName] — [formattedDate] at [formattedTime] at [locationName]. RSVP here: [turnoutUrl]
```

4. **Copy invite button** — copies the full message
5. **Copy link button** — copies just the URL
6. **Web Share button** — when `navigator.share` is available; shares title, full message, and URL
7. "0 people have RSVPd so far — share the link!" (hardcoded; real count in TDD0003)

**Public view** (everyone else):

Turnout title, group name, date, time, location name, and a holding message: "Full details coming soon. Check back before the event!" No RSVP — that's TDD0003.

**Organizer check:** A simple `prisma.groupOrganizer.findFirst({ where: { groupId: turnout.groupId, userId: user.id } })` after `getTurnoutBySlug` is sufficient. Don't fold it into `getTurnoutBySlug` — that function is and should stay public/auth-free.

**Turnout URL format:** Must work on both the `prod` stage (`https://turnout.network/t/[slug]`) and the `sdebaun` dev stage (CloudFront URL). Use `headers()` from `next/headers` to extract the host from the incoming request rather than hardcoding or assuming an env var — SST does not automatically expose a `NEXT_PUBLIC_APP_URL` equivalent.

---

## Auth & Permissions

`/organize` and `/t/[slug]` are public. `createGroupWithTurnoutAction` validates session on every call. The organizer view on `/t/[slug]` is additive — the page renders for everyone, but richer UI appears when the viewer is an authenticated organizer. Any authenticated user can create groups.

---

## Edge Cases & Error Handling

| Scenario | Expected Behavior | Message |
|----------|-----------------|---------|
| Required field missing | Inline error below field | "[Field] is required" |
| Turnout date in the past | Inline error on date field | "Turnout date must be in the future" |
| Group name > 100 chars | Inline error | "Group name must be 100 characters or less" |
| OTP wrong | OTP input shows error, stays open | "Invalid verification code" |
| OTP expired | OTP input shows error + resend offer | "This code has expired. Request a new one." |
| No session when action called | Return `{ error }` | "Not authenticated" |
| Slug collision (nanoid) | Retry up to 3x, then error | "Failed to create turnout. Please try again." |
| Google Places fails to load | Show error, block submission | "Location search is unavailable. Please refresh." |
| User types location but doesn't select from dropdown | Block submission, inline error | "Please select a location from the dropdown." |
| User navigates away during OTP | Form state lost (no persistence) | — (accepted MVP limitation) |
| Form submit with validation errors | Scroll to first error, focus it | Inline below each field |
| Creation in progress (double-click) | Button disabled, no double-submit | — (button state prevents this) |

**Validation rules:**
- `mission`: required, 1–500 chars
- `groupName`: required, 1–100 chars
- `turnoutTitle`: required, 1–100 chars
- `description`: optional, max 1000 chars
- `location.name`: required, 1–200 chars
- `turnoutDate`: required, must be today or future
- `turnoutTime`: required, valid HH:MM
- `turnoutTimezone`: required, valid IANA timezone string
- Phone and display name validation: handled entirely by `AuthModal` / TDD0001 — not validated here

---

## Date/Timezone Handling

On submit, client captures `Intl.DateTimeFormat().resolvedOptions().timeZone` and sends it with the form data. Server converts via `toUTCDate` (see Library Functions). Stored as UTC. Displayed via `toLocaleString()`.

**MVP limitation:** No timezone selector — browser timezone is assumed. An organizer in LA and a participant in NYC will see different times. Acceptable for local organizing; add an explicit selector in the Next phase.

---

## Testing Strategy

### Tier 1: Unit Tests (Vitest) — Mocked External Dependencies

**File:** `lib/groups/groups.test.ts` and `lib/groups/date-utils.test.ts`

**Database:** Dev Neon DB. Truncate tables in `beforeEach` in FK order (children before parents):
`Opportunity` → `Turnout` → `GroupOrganizer` → `Group` → `Location` → `Session` → `Credential` → `User` → `PhoneRateLimit`

Note: `Location` must be truncated after `Opportunity` (because Opportunity has `meetingLocationId` FK to Location). In MVP, `meetingLocationId` is always null, so the order above works — but this dependency is noted for when multi-opportunity ships.

---

#### `date-utils.test.ts`

- `toUTCDate('2025-03-15', '18:00', 'America/New_York')` → equals `new Date('2025-03-15T22:00:00Z')` (EDT, UTC-4 after spring forward)
- `toUTCDate('2025-03-01', '18:00', 'America/New_York')` → equals `new Date('2025-03-01T23:00:00Z')` (EST, UTC-5 before spring forward)
- `toUTCDate('2025-07-04', '14:00', 'America/Los_Angeles')` → equals `new Date('2025-07-04T21:00:00Z')` (PDT, UTC-7)

---

#### `groups.test.ts` — Library Functions

`createGroupWithTurnout`:
- Creates all 5 records (Location, Group, GroupOrganizer, Turnout, Opportunity)
- Returns `ok({ groupId, turnoutId, turnoutSlug })`
- `turnoutSlug` is 8 chars matching `/^[23456789a-z]+$/`
- `GroupOrganizer` links provided `userId` to created Group (via compound PK)
- `Turnout.createdByUserId` equals the provided `userId`
- Default Opportunity has name "Show Up", null meetingLocation, null meetingTime, null capacity
- Rollback: if any step fails, no partial records persist (test by wrapping in a tx that throws after Location creation — verify no Location record remains)
- Slug collision retry: mock nanoid to return a colliding slug on first call, unique on second — verify success on retry

`generateTurnoutSlug`: standard slug sanity checks (length 8, alphabet chars only, consecutive calls differ).

`getTurnoutBySlug`: returns turnout+group+location when found, null when not.

---

#### `apps/web/app/organize/actions.test.ts` — Action Orchestration

Mock `lib/groups` (return `ok(...)` or `err(...)` as needed). Use test session via `createSession` + `setSessionCookie` to simulate auth state.

- Returns `{ error: 'Not authenticated' }` when no session cookie present
- Returns `{ error }` when required fields missing (groupName, mission, turnoutTitle, location.name, turnoutDate, turnoutTime)
- Returns `{ error }` when turnoutDate is in the past
- Returns `{ success: true, turnoutSlug }` on valid input with active session
- Passes `location` as nested object (not flat fields) to `createGroupWithTurnout`
- Returns `{ error }` (not throws) when `createGroupWithTurnout` returns `err(...)`
- Calls `logger.error` when `createGroupWithTurnout` returns `err(...)`

---

### Tier 2: E2E Tests (Playwright, dev) — Full Flow

**File:** `tests/e2e/tdd0002-group-creation/group-creation.spec.ts`

#### Cleanup strategy

The existing `/api/test/cleanup` endpoint does phone-scoped cascade deletes (find user by phone → delete user → cascade to sessions/credentials). The new tables require a different approach because `Group` is not a child of `User` — deleting the user deletes `GroupOrganizer` join records but leaves orphan `Group`, `Turnout`, `Location`, and `Opportunity` records.

**Extend the cleanup endpoint** to also accept `groupIds`. For each: delete Turnouts (cascades to Opportunities) → delete Group → delete Location (Location must go last; Turnout has an FK to it). Alternatively, accept `slugs` and look up the group from the turnout slug.

E2E tests should track which slugs/groupIds they create and clean them up in `afterEach`.

#### Session seeding for authenticated-user tests

The existing `/api/test/seed-user` creates a user + credential but does NOT create a session or return a session cookie. Test 2 (authenticated user flow) requires a session.

**Extend `/api/test/seed-user`** to accept `{ phone, createSession?: boolean }` and when `createSession: true`:
- Create a `Session` record via `createSession(userId)`
- Return `{ userId, sessionToken }` in the response
- The test sets the session cookie manually: `context.addCookies([{ name: 'session', value: sessionToken, ... }])`

---

#### Test 1: Full creation flow (unauthenticated)

1. Cleanup any prior test data for `+12025550110`
2. Navigate to `/organize`
3. Assert: reassurance copy visible (something like "don't think too hard")
4. Assert: NO phone or display name fields on the form
5. Fill in mission textarea
6. Fill in group name
7. Fill in turnout title (or accept pre-fill)
8. Type a location name in the Places autocomplete (e.g., "Joe's Coffee"), wait for suggestions, select the first one (requires `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` set in dev — see Human Prerequisites)
9. Set future date via `<input type="date">`, set time via `<input type="time">`
10. Click "Create Turnout"
11. Assert: `AuthModal` opens (phone input visible)
12. Fill in phone: `+12025550110`
13. Submit phone → assert: display name step visible (new user)
14. Accept or edit display name, submit → assert: OTP step visible
15. Enter `000000` (TEST_OTP_BYPASS code)
16. Assert: redirected to `/t/[slug]`
17. Assert: "Your turnout is live!" (or similar) visible (organizer view)
18. Assert: prewritten invite message visible containing group name + turnout title
19. Assert: turnout URL visible in the invite message
20. Assert: copy button visible

#### Test 2: Creation as authenticated user

1. Seed user + session for `+12025550111` via extended seed endpoint
2. Set session cookie
3. Navigate to `/organize`
4. Assert: NO phone or displayName fields anywhere on page (form is identity-free)
5. Fill in form fields (mission, groupName, turnoutTitle, date, time); select a location via Places autocomplete
6. Click "Create Turnout"
7. Assert: `AuthModal` does NOT open
8. Assert: redirected to `/t/[slug]` directly

#### Test 3: Validation errors prevent submission

1. Navigate to `/organize`
2. Click "Create Turnout" without filling required fields
3. Assert: validation error messages visible
4. Assert: no OTP modal
5. Assert: still on `/organize`

#### Test 4: Past date rejected

1. Navigate to `/organize`
2. Fill all fields with a past date
3. Click "Create Turnout"
4. Assert: error on date field

---

## NPM Dependencies

```bash
pnpm add nanoid@3 date-fns-tz @vis.gl/react-google-maps
```

**`nanoid@3`:** Pinned to v3 for CJS compatibility with Vitest. v4+ is ESM-only and breaks the test suite. Use `customAlphabet`.

**`date-fns-tz`:** IANA timezone-aware date conversion. `fromZonedTime(localDateString, ianaTimezone)` → UTC Date. Handles DST correctly where raw `getTimezoneOffset()` does not.

**`@vis.gl/react-google-maps`:** Google Maps React bindings. Use `PlaceAutocompleteClassic` specifically (handles session tokens). Wrap in `dynamic(..., { ssr: false })`.

---

## Open Questions / Decisions Made

**Made:**
- ✅ **Slug format:** 8-char nanoid, unambiguous alphabet. Not sequential (guessable). Not UUID (too long).
- ✅ **Turnout URL pattern:** `/t/[slug]` — established here; TDD0003 builds the full route.
- ✅ **Redirect after creation goes to `/t/[slug]`:** Bob lands on the page he's about to share, sees it from his friends' perspective, plus the organizer invite UI. No separate confirmation page needed.
- ✅ **`/t/[slug]` shows organizer invite UI when viewer is the organizer:** Same route, two views. Organizer check is a separate query after `getTurnoutBySlug` — don't fold it in, `getTurnoutBySlug` should stay auth-free.
- ✅ **Single-page form:** Not multi-step wizard. PRD endorses this.
- ✅ **No AI group name suggestion:** Bob types it himself. Placeholder text guides him.
- ✅ **Timezone via IANA name:** `Intl.DateTimeFormat().resolvedOptions().timeZone` + `date-fns-tz`. Handles DST correctly. No user-facing timezone selector needed.
- ✅ **`GroupOrganizer` compound PK:** `@@id([groupId, userId])` — no synthetic `id`. The identity IS the pair.
- ✅ **Form contains no identity fields:** Phone and display name are handled entirely by `AuthModal` (TDD0001). The form collects only turnout data. This avoids double-entry and fully reuses the auth flow as designed.
- ✅ **`AuthModal` fires on submit for unauthenticated users:** The modal handles new vs. returning user, display name, and OTP exactly as TDD0001 designed. The `onSuccess` callback chains into creation. Authenticated users skip the modal entirely.
- ✅ **`AuthModal` never calls `router.refresh()` internally:** It's a dumb modal — it calls `onSuccess?.()` and closes. Callers decide what happens next. This is a small refactor of TDD0001's implementation, shipped as part of TDD0002.
- ✅ **No draft mode:** Live immediately after OTP.
- ✅ **`PlaceAutocompleteClassic` over `usePlacesService`:** Session token handling is automatic, preventing per-keystroke billing.
- ✅ **`dynamic(..., { ssr: false })` for maps component:** Prevents hydration errors from Maps JS API needing `window`.
- ✅ **Prewritten invite text:** Explicitly in user story. Post-creation page generates it from turnout data.
- ✅ **Native `<input type="date/time">`:** Faster on mobile, no library dependency, OS-level UI.
- ✅ **`createdByUserId` on Turnout:** Nullable FK, always set in practice. Prevents prd0007 retrofit.
- ✅ **`TurnoutStatus` enum:** UPCOMING default; CANCELED/COMPLETED exist for prd0005/prd0006.
- ✅ **`endsAt` nullable on Turnout:** TDD0003 will default to `startsAt + 2h` for .ics. At least it won't be a surprise.
- ✅ **`nanoid@3` pinned:** v4+ is ESM-only and breaks Vitest. Pin to v3 upfront, not as a fallback.

**Note for TDD0003:** `Turnout.endsAt` is nullable. When generating .ics calendar files, default to `startsAt + 2 hours` if `endsAt` is null. Document this assumption in TDD0003.

---

## Related Context

- **PRD:** prd0002-group-turnout-creation.md
- **Roadmap Phase:** MVP Week 2-3
- **Depends on:** TDD0001 (phone identity — shipped and live)
- **Unlocks:** TDD0003 (public turnout pages + RSVP — builds on `/t/[slug]` route stub and Turnout data)
- **Eventual expansion:** TDD0006 (group dashboard — `/groups/[groupId]` organizer view deferred entirely; `/t/[slug]` organizer UI will be extended when full RSVP data is available)
