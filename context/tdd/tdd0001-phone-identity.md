# TDD: Phone-Based Identity System

**PRD:** prd0001-phone-identity.md
**Status:** Draft
**Last Updated:** 2026-02-18 (Revised: WebOTP custom template confirmed created and secrets set — folded into MVP scope)

## Context

_What I found:_

- **Vision alignment:** "Open Door Principle" - prioritize accessibility over hardened security. Frictionless auth matches this philosophy.
- **Roadmap phase:** MVP Week 1, first initiative, foundational for all features.
- **Architecture constraints:** Next.js App Router, Server Components + Server Actions (default), Prisma + Postgres (Neon), SST on AWS, Twilio Verify API. TypeScript throughout.
- **Key PRD design hints:**
  - OTP codes (10-min expiry, 6 digits) chosen over magic links for better SMS deliverability
  - WebOTP API for one-tap autofill on mobile (via Twilio Verify custom templates)
  - Credential-agnostic design (support future email via `credentials` table)
  - Database-backed sessions for future session management
  - Persistent sessions (no expiration)

---

## Overview

**Problem:** Users need frictionless authentication for sporadic usage patterns (might return weeks later) without passwords.

**Solution:** Phone-based OTP codes via Twilio Verify API. Phone number = identity. Enter 6-digit code (or tap autofill on mobile), get persistent session, optionally customize display name.

**What this TDD builds:** Auth primitives — library functions (`users.ts`, `otp.ts`, `sessions.ts`) and reusable components (`AuthModal`, `PhoneInputForm`, `DisplayNameForm`, `OTPInputForm`). The existing placeholder home page (`/`) gets a sign-in/sign-up button and logout button as the minimal composition of those primitives — sufficient for direct access and testing.

**How downstream TDDs use this:** TDD0002 (group/turnout creation) and TDD0003 (RSVP modal) will compose these same primitives into context-specific flows. They should not replicate auth logic — only assemble the components differently.

**The auth flow** (same regardless of context — RSVP modal, turnout creation, direct login):

1. User enters phone number
2. System checks if phone is known → `isNewUser`
3. **New user:** display name field appears (prefilled random, rerollable) → user confirms → OTP sent
   **Returning user:** OTP sent immediately
4. User enters 6-digit code on OTP screen
5. Session created → authenticated

**Scope:**

- ✅ Phone number authentication (E.164 format)
- ✅ SMS OTP codes via Twilio Verify (10-min expiry, single-use, 4-10 digits configurable)
- ✅ WebOTP API (one-tap autofill on mobile via custom Verify template — in MVP)
- ✅ Persistent sessions (database-backed)
- ✅ Random display name generation (optional override)
- ✅ Rate limiting (application-level + Twilio Verify's built-in limits)
- ❌ Email authentication (future)
- ❌ Session expiration (future, if needed)
- ❌ 2FA/MFA (future)

---

## Frontend Components

The components below are reusable auth primitives. Downstream TDDs compose them into context-specific flows — they are not bound to the patterns used by the `/login` placeholder.

### Pages/Routes

No new pages. The existing placeholder home page (`app/page.tsx`, route `/`) is updated to add auth UI:

- **Unauthenticated:** shows a "Sign In / Sign Up" button that opens `AuthModal`
- **Authenticated:** shows the user's display name and a logout button

`app/page.tsx` is a Server Component — call `getUser()` to determine which state to render. After successful auth, `AuthModal` calls `router.refresh()` and the page re-renders with the session.

### Components (Reusable Primitives)

- **`AuthModal`** - Modal managing the full auth flow as progressive steps. Owned state: `phone`, `isNewUser`, `displayName`, `step` (`phone | displayName | otp`). `displayName` is set when the user submits `DisplayNameForm` and must be carried into the `otp` step so it can be passed to `signInAction`. Accepts optional `title` and `body` props for contextual messaging above the form — downstream TDDs pass in their own copy (e.g. "Where should we send your reminders?"); the placeholder home page uses generic defaults. Composed from the primitives below.

- **`PhoneInputForm`** - Phone number input and submit. Calls `checkPhoneAction(phone)` → receives `{ isNewUser }`. For returning users, also calls `sendOTPAction(phone)` immediately. Advances modal to `displayName` (new) or `otp` (returning) step.

- **`DisplayNameForm`** - Display name input prefilled with a randomly generated name (adjective + animal, `unique-names-generator`). Reroll button. On submit, calls `sendOTPAction(phone)` then advances modal to `otp` step.

- **`OTPInputForm`** - 6-digit code input. Implements `navigator.credentials.get({ otp: { transport: ['sms'] } })` for WebOTP autofill on mobile (iOS 14+, Android Chrome 84+) — falls back to manual entry. Includes "Resend code" button (calls `sendOTPAction`, respects rate limiting). On submit, calls `signInAction(phone, code, displayName?)`. On success, closes modal and calls `router.refresh()`.

- **`getUser()`** - Server utility: reads session cookie → validates token against DB → returns `User | null`. Call from any Server Component that needs the current user. Client Components needing auth state receive `user` as a prop from their Server Component parent.

### User Interactions (Placeholder Home Page)

_TDD0002 and TDD0003 compose the same primitives into their own flows — they are not constrained to match these._

**Flow 1: New user**

1. User clicks "Sign In / Sign Up" → `AuthModal` opens at `phone` step
2. Enters phone → `checkPhoneAction` returns `{ isNewUser: true }` → modal advances to `displayName` step
3. User sets display name (prefilled random, rerollable) → submits → `sendOTPAction` called → modal advances to `otp` step
4. User enters code (or taps WebOTP autofill) → `signInAction(phone, code, displayName)` → **User + Credential + session created**
5. Modal closes → `router.refresh()` → page shows display name + logout button

**Flow 2: Returning user**

1. User clicks "Sign In / Sign Up" → `AuthModal` opens at `phone` step
2. Enters phone → `checkPhoneAction` returns `{ isNewUser: false }` → `sendOTPAction` called immediately → modal advances to `otp` step
3. User enters code → `signInAction(phone, code)` → session created
4. Modal closes → `router.refresh()` → page shows display name + logout button

**Flow 3: Invalid OTP code**

1. User is on `otp` step, enters wrong code → `signInAction` returns error
2. Modal stays on `otp` step, shows error: "Invalid verification code"
3. User can re-enter code or click "Resend code" (triggers `sendOTPAction`, respects rate limit)

**Flow 4: Rate limited**

1. User triggers OTP send (returning user phone submit, new user display name submit, or resend button)
2. `sendOTPAction` returns rate limit error
3. Modal shows error at current step: "Please wait 60 seconds before requesting another code"

**Flow 5: Logout**

1. Authenticated user clicks logout button on home page
2. `logoutAction()` → session deleted from DB → cookie cleared → returns `{ success: true }`
3. Caller calls `router.refresh()` → page re-renders unauthenticated: shows "Sign In / Sign Up" button

---

## Database Schema

### Prisma Models

```prisma
// Enums
enum CredentialType {
  PHONE
  // Future: EMAIL
}

// Core user identity
model User {
  id          String   @id @default(cuid())
  displayName String   // Random by default (e.g., "OrangeArmadillo")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  credentials Credential[]
  sessions    Session[]
}

// Credentials table (future-proof for email)
// Invariant: User and Credential are always created together in signInAction — never independently.
model Credential {
  id           String         @id @default(cuid())
  userId       String
  user         User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  credentialType CredentialType // PHONE or EMAIL (future)
  credential     String         // Phone number (E.164) or email

  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  @@unique([credentialType, credential])
  @@index([userId])
}

// Rate limiting keyed by phone string — independent of User/Credential so it works for
// new users before any account exists. Intentionally not FK'd to Credential: the record
// must survive credential deletion to prevent delete-and-reregister abuse.
model PhoneRateLimit {
  phone           String    @id  // E.164 phone number
  lastOTPSentAt   DateTime?
  otpCountToday   Int       @default(0)
  otpCountResetAt DateTime?
}

// Database-backed sessions
model Session {
  id           String    @id @default(cuid())
  userId       String
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  token        String    @unique // Session token (stored in cookie)
  createdAt    DateTime  @default(now())
  lastActiveAt DateTime  @default(now())

  // Future session management fields
  userAgent    String?
  ipAddress    String?

  @@index([token])
  @@index([userId])
}
```

### Migration Notes

- **⚠️ DESTRUCTIVE MIGRATION:** The bootstrap `User` model (`lib/db/schema.prisma`) has a `phoneNumber String @unique` field that does NOT match this schema. The migration will drop that table and replace it with the three models above.
- **This is intentional and safe.** The bootstrap User model was a placeholder to prove Prisma worked end-to-end. There are no real users, no foreign keys in other tables, no data worth preserving. Drop it without hesitation.
- Run `pnpm prisma migrate dev --name phone-identity` — the generated migration will drop the old `User` table and create `User`, `Credential`, `Session`, and `PhoneRateLimit`.
- **OTPCode model deliberately absent:** Twilio Verify manages OTP codes (generation, storage, expiry, validation). No cleanup cron needed.
- **Rate limiting in `PhoneRateLimit`, not `Credential`:** Keyed by phone string so it applies to new users before any account exists. Not FK'd to `Credential` — survives account deletion intentionally.

---

## Server Actions

Thin orchestrators in `apps/web/app/auth/actions.ts`. Each validates input, calls library functions, handles errors. No business logic lives here.

**Note on return vs. redirect():** Actions return results rather than calling `redirect()` directly. This keeps them composable — the placeholder home page handles navigation after auth, but TDD0003's RSVP modal will call the same actions and handle post-auth flow itself (close modal, trigger RSVP) without navigating away.

---

### `checkPhoneAction(phone)`

**Input:** `{ phone: string }`
**Output:** `{ isNewUser: boolean }` or `{ error: string }`

1. Validate + normalize phone (E.164 via `libphonenumber-js`) → error if invalid
2. Check if `Credential` exists for this phone → `isNewUser = !exists`
3. Return `{ isNewUser }`

---

### `sendOTPAction(phone)`

**Input:** `{ phone: string }`
**Output:** `{ success: true }` or `{ error: string }`

1. Validate + normalize phone → error if invalid
2. `checkRateLimit(phone)` → return error if limited
3. `sendOTPCode(phone)` → return error if Twilio throws
4. `incrementRateLimit(phone)`
5. Return `{ success: true }`

---

### `signInAction(phone, code, displayName?)`

**Input:** `{ phone: string, code: string, displayName?: string }`
**Output:** `{ success: true, isNewUser: boolean }` or `{ error: string }`

1. Validate + normalize phone; validate code format (4-10 digits)
2. `checkOTPCode(phone, code)` → return error if invalid/expired/Twilio failure
3. Check if `Credential` exists for phone → `isNewUser = !exists`
4. If new user: `createUserWithCredential(phone, displayName)` → `{ userId }` (single atomic transaction)
5. If returning: `getCredentialByPhone(phone)` → `userId`
6. `createSession(userId, userAgent, ipAddress)` → token
7. `setSessionCookie(token)`
8. Return `{ success: true, isNewUser }`

---

### `logoutAction()`

**Output:** `{ success: true }`

1. Read token from session cookie
2. `deleteSession(token)` (if token exists)
3. `clearSessionCookie()`
4. Return `{ success: true }`

**Note:** Always succeeds, even if session is invalid or cookie is missing. The caller handles any redirect — on the placeholder home page, the logout button calls `logoutAction()` then `router.refresh()`.

---

## Auth Library

Business logic, each function independently testable. No Server Action concerns (no cookies, no redirects, no error formatting) except where noted.

All functions that can meaningfully fail return `ResultAsync<T, E>` from neverthrow. Simple queries that return null on miss stay as `Promise<T | null>` — null is a valid expected state, not an error.

---

### `apps/web/lib/auth/users.ts`

**`checkPhoneExists(phone)`** → `ResultAsync<{ isNewUser: boolean }, string>`

- Look up `Credential` by `{ credentialType: PHONE, credential: phone }`
- Return `ok({ isNewUser: false })` if found, `ok({ isNewUser: true })` if not
- Return `err(...)` on DB failure

**`createUserWithCredential(phone, displayName?)`** → `ResultAsync<{ userId: string }, string>`

- Run in a transaction: create `User` (with `displayName` if provided, else random name via `unique-names-generator`) + `Credential`
- Return `ok({ userId })` on success, `err(...)` on DB failure

**`getCredentialByPhone(phone)`** → `Promise<Credential | null>`

- DB lookup by `{ credentialType: PHONE, credential: phone }` — null if not found

---

### `apps/web/lib/auth/otp.ts`

**Error types:**
```typescript
type RateLimitError = { code: 'RATE_LIMITED_MINUTE' } | { code: 'RATE_LIMITED_DAY' }
type OTPError = { code: 'INVALID_CODE' } | { code: 'CODE_EXPIRED' } | { code: 'TWILIO_ERROR'; message: string }
```

**`checkRateLimit(phone)`** → `ResultAsync<void, RateLimitError>`

- Look up `PhoneRateLimit` by phone (no record = never sent → `ok()`)
- If `lastOTPSentAt` < 60s ago: `err({ code: 'RATE_LIMITED_MINUTE' })`
- If `otpCountToday >= 5` and `otpCountResetAt` is today: `err({ code: 'RATE_LIMITED_DAY' })`
- Otherwise: `ok()`

**`incrementRateLimit(phone)`** → `ResultAsync<void, string>`

- Upsert `PhoneRateLimit` by phone: set `lastOTPSentAt = now()`, increment `otpCountToday`, reset counter if `otpCountResetAt` is before today

**`sendOTPCode(phone)`** → `ResultAsync<void, { code: 'TWILIO_ERROR'; message: string }>`

- Call Twilio `verifications.create({ to: phone, channel: 'sms', templateSid })`
- Return `ok()` on success, `err({ code: 'TWILIO_ERROR', message })` on failure

**`checkOTPCode(phone, code)`** → `ResultAsync<void, OTPError>`

- Call Twilio SDK: `client.verify.v2.services(serviceSid).verificationChecks.create({ to: phone, code })`
- Return `ok()` if `status === 'approved'`
- Return `err({ code: 'CODE_EXPIRED' })` if `status === 'expired'` (verification window has passed)
- Return `err({ code: 'INVALID_CODE' })` for any other status — wrong code, max attempts, canceled, deleted, whatever
- Return `err({ code: 'TWILIO_ERROR', message })` if the SDK throws unexpectedly

---

### `apps/web/lib/auth/sessions.ts`

**`createSession(userId, userAgent?, ipAddress?)`** → `ResultAsync<string, string>`

- Generate cryptographically random token (32 bytes, hex-encoded = 64 chars)
- Create `Session` record in DB
- Return `ok(token)` on success, `err(...)` on DB failure

**`deleteSession(token)`** → `ResultAsync<void, string>`

- Delete `Session` record by token, return `err(...)` on DB failure

**`setSessionCookie(token)`** → `void`

- Set HttpOnly, Secure, SameSite=Lax, no-expiry cookie via Next.js `cookies()` API (synchronous)

**`clearSessionCookie()`** → `void`

- Delete the session cookie (synchronous)

**`getUser()`** → `Promise<User | null>`

- Read session token from cookie, look up `Session` joined to `User`, return `User` or null

---

## Auth & Permissions

**Session security:**

- Session tokens are cryptographically random (32 bytes, hex-encoded = 64 chars)
- HttpOnly cookies (not accessible to JavaScript)
- Secure flag (HTTPS only) in production
- sameSite: 'lax' (CSRF protection)
- No expiration (persistent sessions per PRD)

---

## Success Criteria

After TDD0001 is implemented, the system should:

- ✅ Allow new users to authenticate via phone + OTP code
- ✅ Allow returning users to authenticate and maintain persistent sessions
- ✅ Send OTP codes via Twilio Verify API using custom WebOTP template
- ✅ Enforce application-level rate limits (1/min, 5/day per phone)
- ✅ WebOTP autofill works on mobile (iOS 14+, Android Chrome 84+) via custom template
- ✅ Generate random display names for new users (optional customization)
- ✅ Create database-backed sessions (persistent until logout)
- ✅ All Tier 1 unit tests pass (mocked Twilio)
- ✅ All Tier 3 CI E2E tests pass (`TEST_OTP_BYPASS=true`)
- ✅ Deploy to dev stage and verify auth flow works end-to-end

---

## Edge Cases & Error Handling

| Scenario                       | Expected Behavior       | Error Message                                             |
| ------------------------------ | ----------------------- | --------------------------------------------------------- |
| Invalid phone format           | Return error            | "Invalid phone number. Use format: +1234567890"           |
| Application rate limit (60s)   | Return error            | "Please wait 60 seconds before requesting another code"   |
| Application rate limit (daily) | Return error            | "Too many codes requested today. Try again tomorrow."     |
| Twilio Verify rate limit       | Return error            | "Too many verification attempts. Please try again later." |
| Code expired (Twilio)          | Return error            | "This code has expired. Request a new one."               |
| Code invalid (Twilio)          | Return error            | "Invalid verification code"                               |
| Twilio API error               | Log error, return error | "Verification system unavailable. Please try again."      |
| Display name too long          | Return error            | "Display name must be 50 characters or less"              |
| Display name invalid chars     | Return error            | "Display name contains invalid characters"                |

**Validation rules:**

- ✅ Phone must match E.164 format: `^\+[1-9]\d{1,14}$` (validated via `libphonenumber-js`)
- ✅ Application rate limits: 1 OTP per 60 seconds per phone, 5 OTP per day per phone
- ✅ Twilio Verify handles: code expiry (10 min default), single-use enforcement, code correctness
- ✅ Display name must be 1-50 chars, alphanumeric + spaces/hyphens/underscores
- ✅ Session tokens are cryptographically random (32 bytes hex, 64 chars)

---

## Prerequisites

**✅ Prerequisites Complete - Ready for Implementation**

The following setup has been completed:

**Twilio Verify Service:**

- Service created: "turnout-network"
- Service SID: `VA0c58bce0d3676488f1d5921156ff5d1e`
- Configuration: Custom WebOTP template active — see WebOTP Template section for details

**SST Secrets Configured:**

Secrets are set for both development and production stages:

**Dev stage (`sdebaun`):**

- ✅ `TwilioAccountSid` - Live credentials (real SMS sent to test number during dev)
- ✅ `TwilioAuthToken` - Auth token
- ✅ `TwilioVerifyServiceSid` - `VA0c58bce0d3676488f1d5921156ff5d1e`
- ✅ `TwilioVerifyTemplateSid` - Custom WebOTP template SID (`HJ...`)
- ✅ `TwilioTestSmsRecipientPhoneNumber` - Dedicated Twilio number for receiving test OTPs (E2E + canary)
- ✅ `DatabaseUrl` - Neon database connection

**Production stage (`prod`):**

- ✅ `TwilioAccountSid` - Production credentials
- ✅ `TwilioAuthToken` - Production auth token
- ✅ `TwilioVerifyServiceSid` - `VA0c58bce0d3676488f1d5921156ff5d1e` (same Service)
- ✅ `TwilioVerifyTemplateSid` - Custom WebOTP template SID (`HJ...`) (same template)
- ✅ `TwilioTestSmsRecipientPhoneNumber` - Same dedicated test number (used by prod canary cron)
- ✅ `DatabaseUrl` - Neon production database

**Agent Verification:**

```bash
# Verify all secrets exist in both stages before starting:
sst secret list --stage sdebaun
sst secret list --stage prod
# Expected: TwilioAccountSid, TwilioAuthToken, TwilioVerifyServiceSid, TwilioVerifyTemplateSid, TwilioTestSmsRecipientPhoneNumber, DatabaseUrl
```

All required secrets are present. **No blocking dependencies for implementation.**

**Test vs Production Behavior:**

- Dev stage (`sdebaun`): Uses live Twilio credentials. Real OTPs are sent to `TwilioTestSmsRecipientPhoneNumber` for E2E tests. See Testing Strategy (Tier 2).
- CI: Uses `TEST_OTP_BYPASS=true` — no Twilio credentials needed. See Testing Strategy (Tier 3).
- Production stage (`prod`): Same live credentials, real SMS sent to real users.

---

## Testing Strategy

Four tiers. Each catches a different class of failure. The tiers are independent — you can run any of them without the others.

---

### Tier 1: Unit Tests (Vitest) — Mocked Twilio

Mock the Twilio client entirely. No credentials needed, no network calls. Tests all business logic in isolation.

**Database setup:** Tests run against the dev Neon database (`DATABASE_URL` from `.env.local`). No separate test DB — truncate the relevant tables in a `beforeEach` or `beforeAll` block instead. Tables to truncate: `Session`, `Credential`, `User`, `PhoneRateLimit`. Order matters — truncate child tables before parent tables (Sessions → Credentials → Users; PhoneRateLimit is independent). Using `TRUNCATE ... CASCADE` or deleting in FK order both work.

Mock the `twilio` module in Vitest (e.g., in `vitest.setup.ts` or per test file). The mock should simulate: (a) successful OTP sending for `verifications.create`, (b) `status: 'approved'` for correct codes, (c) `status: 'expired'` for expired verifications, (d) any non-approved/non-expired status for wrong codes, and (e) thrown exceptions for unexpected API failures.

**Required tests — library functions (test business logic directly):**

`users.ts`:

- `checkPhoneExists` returns `ok({ isNewUser: true })` for an unknown phone number
- `checkPhoneExists` returns `ok({ isNewUser: false })` for a phone with an existing `Credential`
- `checkPhoneExists` returns `err(...)` on DB failure
- `createUserWithCredential` creates both `User` and `Credential` in a single transaction, returns `ok({ userId })`
- `createUserWithCredential` uses provided `displayName` when given
- `createUserWithCredential` generates a random display name when `displayName` is omitted
- `createUserWithCredential` returns `err(...)` on DB failure (transaction rolled back — no partial records)
- `getCredentialByPhone` returns the `Credential` record for a known phone
- `getCredentialByPhone` returns `null` for an unknown phone

`otp.ts`:

- `checkRateLimit` returns `err({ code: 'RATE_LIMITED_MINUTE' })` if `lastOTPSentAt` is within 60s
- `checkRateLimit` returns `err({ code: 'RATE_LIMITED_DAY' })` if `otpCountToday >= 5` and `otpCountResetAt` is today
- `checkRateLimit` returns `ok()` and resets daily counter if `otpCountResetAt` is before today
- `checkRateLimit` returns `ok()` when no `PhoneRateLimit` record exists (phone has never sent OTP)
- `sendOTPCode` returns `ok()` on successful Twilio `verifications.create` call
- `sendOTPCode` returns `err({ code: 'TWILIO_ERROR', message })` when Twilio API throws
- `checkOTPCode` returns `ok()` when SDK returns `status: 'approved'`
- `checkOTPCode` returns `err({ code: 'INVALID_CODE' })` when SDK returns any non-approved/non-expired status (wrong code)
- `checkOTPCode` returns `err({ code: 'CODE_EXPIRED' })` when SDK returns `status: 'expired'`
- `checkOTPCode` returns `err({ code: 'TWILIO_ERROR', message })` when SDK throws unexpectedly

`sessions.ts`:

- `createSession` creates a `Session` record in DB and returns `ok(token)` where token is 64 hex chars
- `deleteSession` removes the `Session` record by token, returns `ok()`
- `getUser` returns `null` for an unrecognized token
- `getUser` returns the associated `User` for a valid session token

**Required tests — action orchestration:**

- `checkPhoneAction` returns `{ isNewUser: true }` for an unknown phone
- `checkPhoneAction` returns `{ isNewUser: false }` for a known phone
- `checkPhoneAction` returns `{ error }` for an invalid phone format (not E.164)
- `sendOTPAction` returns `{ success: true }` when OTP is sent successfully
- `sendOTPAction` returns `{ error }` (not exception) when application rate limit is exceeded
- `sendOTPAction` returns `{ error }` (not exception) on Twilio API failure
- `signInAction` for a new user: creates User + Credential + Session, sets session cookie, returns `{ success: true, isNewUser: true }`
- `signInAction` for a returning user: creates Session only, sets session cookie, returns `{ success: true, isNewUser: false }`
- `signInAction` uses the provided `displayName` when creating a new user
- `signInAction` returns `{ error }` for an invalid or rejected OTP code
- `logoutAction` deletes the `Session` record from DB, clears the session cookie, and returns `{ success: true }`

---

### Tier 2: E2E Tests (Playwright, dev) — Real SMS via Test Number

Uses the dedicated test Twilio number (`TwilioTestSmsRecipientPhoneNumber`) to exercise the full delivery path. Sends a real OTP, receives it via the Twilio Messages API, parses the code, completes the auth flow in the browser.

**What this catches:** Full user journey including actual SMS delivery, template format, and redirect logic. Does NOT test carrier filtering (Twilio→Twilio delivery).

**Environment:** Requires all Twilio secrets plus `TwilioTestSmsRecipientPhoneNumber` available to the Next.js dev server. Set in `.env.local` (not committed):

```bash
# .env.local (dev only, never committed)
DATABASE_URL=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_VERIFY_SERVICE_SID=VA0c58bce0d3676488f1d5921156ff5d1e
TWILIO_VERIFY_TEMPLATE_SID=HJ...
TWILIO_TEST_SMS_RECIPIENT_PHONE_NUMBER=+1...
```

**`waitForSms` helper** — `apps/web/lib/test-helpers/wait-for-sms.ts`:

A polling helper that uses the Twilio Messages API to wait for an SMS to arrive on the test number. Poll every ~2 seconds up to a 30-second timeout. Accept a `before` timestamp and only return messages received after that time. Parse the 6-digit code from the message body (the template format is `123456 is your turnout.network verification code. @turnout.network #123456`). Throw if timeout exceeded.

**E2E test descriptions:**

- **New user flow:** Navigate to `/`, click "Sign In / Sign Up", enter `TwilioTestSmsRecipientPhoneNumber`. Set display name, submit. Call `waitForSms()` to get real code. Enter code. Expect modal to close and page to show display name + logout button.
- **Returning user flow:** Same as above after the first session is cleared. Expect modal to close and page to show display name + logout button.
- **Invalid code:** Navigate to `/`, open modal, enter test phone, submit. Enter wrong code. Expect error message visible in modal.
- **Rate limit:** Submit phone twice in rapid succession. Expect error shown on second attempt.

**WebOTP autofill:**

- Cannot be tested in Playwright (requires a real mobile device receiving a real SMS)
- Validate manually on iOS/Android after deploy

---

### Tier 3: E2E Tests (Playwright, CI) — `TEST_OTP_BYPASS`

In CI there is no real Twilio number and no SMS. The `TEST_OTP_BYPASS` env var short-circuits Twilio in the library functions (`sendOTPCode` / `checkOTPCode`), allowing the full UI flow to be tested without real SMS.

**App code change required in `sendOTPCode` and `checkOTPCode` (lib/auth/otp.ts):**

The bypass lives in the library functions, not the actions — this keeps the actions clean and ensures all DB logic still runs through the normal path. When `process.env.TEST_OTP_BYPASS === 'true'`: `sendOTPCode` skips the `verifications.create()` call and returns silently; `checkOTPCode` accepts `000000` as a valid code and skips the `verificationChecks.create()` call. All other logic (User/Credential creation via `createUserWithCredential`, session creation, cookies, redirects) runs exactly as normal.

**⚠️ `TEST_OTP_BYPASS` must NEVER be set in production.** All DB logic (User/Credential creation, Session creation) still runs — only the Twilio API calls are skipped.

**CI environment:** Set `TEST_OTP_BYPASS=true` and a CI test database URL in GitHub Actions secrets. No Twilio credentials needed in CI.

**Required tests:** Same as Tier 2, but `TEST_OTP_BYPASS=true` and always use `000000` as the code.

---

### Tier 4: SMS Delivery Canary (Lambda Cron)

A scheduled Lambda that runs every hour, sends a real OTP to the test number, receives it, and verifies it end-to-end. This is the production early-warning system for silent SMS delivery failures.

**What this catches:** Twilio API outages, carrier filtering, template breakage, delivery latency spikes. Alerts before users notice.

**File:** `apps/functions/src/sms-delivery-canary.ts`

**Logic:**

1. Record `before = new Date()`
2. Call Twilio Verify to send OTP to `TWILIO_TEST_SMS_RECIPIENT_PHONE_NUMBER`
3. Poll `client.messages.list({ to: testNumber })` for SMS arriving after `before`
4. Parse 6-digit code from message body
5. Call Twilio Verify check with parsed code — assert `status === 'approved'`
6. On any failure or timeout: throw (Lambda failure triggers CloudWatch alarm)

**SST config additions:** Add a new `sst.aws.Cron` resource named `SmsDeliveryCanary` in `sst.config.ts`. The handler is at `apps/functions/src/sms-delivery-canary.ts`. Link all five Twilio SST secrets (AccountSid, AuthToken, VerifyServiceSid, VerifyTemplateSid, TestSmsRecipientPhoneNumber). Set timeout to 60 seconds (SMS delivery can be slow). Schedule: `rate(6 hours)` — 4 runs/day stays well under the 5/day application rate limit for the test phone number. Add a CloudWatch alarm alongside it that alerts via SNS email if the Lambda errors — if the canary fails, you know before your users do.

---

### What's Not Tested (Acceptable for MVP)

- ❌ Carrier-specific filtering (Twilio→Twilio delivery doesn't test AT&T, Verizon, T-Mobile routing)
- ❌ WebOTP keyboard autofill (requires real mobile device)
- ❌ International SMS delivery (US-only for MVP)

---

## Decisions Made

- ✅ **Twilio error handling:** Fail gracefully and log (don't expose Twilio error details to users, monitor via Sentry)
- ✅ **Session token rotation:** Static tokens for MVP (persistent sessions per PRD; add rotation post-MVP if needed)
- ✅ **Display name uniqueness:** Allow duplicates (not required by PRD; users can customize if they want unique names)
- ✅ **Rate limit reset logic:** Daily counter resets at midnight UTC (compare dates to determine "same day")

---

## NPM Dependencies

```bash
pnpm add twilio libphonenumber-js unique-names-generator neverthrow
pnpm add -D @types/node
```

`neverthrow` provides `Result<T, E>` and `ResultAsync<T, E>` for type-safe error handling without exceptions. Use `ok()`, `err()`, `okAsync()`, `errAsync()` constructors. Chain with `.andThen()`, `.map()`, `.mapErr()`. For complex flows, `safeTry` with generator functions provides do-notation style chaining. See [neverthrow docs](https://github.com/supermacro/neverthrow).

---

## WebOTP Template

**Status: ✅ Complete.** Custom Twilio Verify template created and approved. `TwilioVerifyTemplateSid` secret set in both `sdebaun` and `prod` stages.

**Template format:** `{{code}} is your {{friendly_name}} verification code. @turnout.network #{{code}}`

The `@turnout.network #{{code}}` suffix is what triggers browser autofill on iOS 14+ and Android Chrome 84+. The template SID is passed as `templateSid` in every `verifications.create()` call — no Console default needed.

**Post-deploy validation:** Send real verification to a physical mobile device; confirm keyboard autofills the code and tapping it fills the OTP input.

---

## Related Context

- **Roadmap Phase:** MVP Week 1 (foundational — all other features depend on this)
- **Related TDDs:** None upstream; all downstream TDDs depend on this
