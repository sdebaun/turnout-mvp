# TDD: Phone-Based Identity System

**PRD:** prd0001-phone-identity.md
**Status:** Draft
**Last Updated:** 2026-02-17 (Revised: Switched to Twilio Verify API for better deliverability and simpler implementation)

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
- **Architecture decision:** Use Twilio Verify API instead of raw SMS for OTP delivery. Verify provides better deliverability (even without 10DLC), built-in security features, and simpler implementation.

---

## Overview

**Problem:** Users need frictionless authentication for sporadic usage patterns (might return weeks later) without passwords.

**Solution:** Phone-based OTP codes via Twilio Verify API. Phone number = identity. Enter 6-digit code (or tap autofill on mobile), get persistent session, optionally customize display name.

**Scope:**
- ✅ Phone number authentication (E.164 format)
- ✅ SMS OTP codes via Twilio Verify (10-min expiry, single-use, 4-10 digits configurable)
- ✅ WebOTP API (one-tap autofill on mobile via custom template)
- ✅ Persistent sessions (database-backed)
- ✅ Random display name generation (optional override)
- ✅ Rate limiting (application-level + Twilio Verify's built-in limits)
- ❌ Email authentication (future)
- ❌ Session expiration (future, if needed)
- ❌ 2FA/MFA (future)

---

## Components

**What this touches:**

- [x] Database (Prisma schema - 3 new models: User, Credential, Session)
- [x] Server Actions (send OTP via Verify API, verify OTP via Verify API, logout, update display name)
- [x] API route (OTP verification for WebOTP API)
- [x] Frontend (phone + OTP input, WebOTP autofill, display name customization)
- [x] External service (Twilio Verify API for OTP generation, delivery, validation)
- [x] Auth/permissions (this IS the auth system)

**What this does NOT touch:**
- ❌ Background jobs (Twilio Verify handles OTP expiry and cleanup)

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
model Credential {
  id           String         @id @default(cuid())
  userId       String
  user         User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  credentialType CredentialType // PHONE or EMAIL (future)
  credential     String         // Phone number (E.164) or email
  verifiedAt     DateTime?      // Null until OTP verified

  // Rate limiting fields (application-level, supplements Twilio Verify's limits)
  lastOTPSentAt   DateTime?
  otpCountToday   Int        @default(0)
  otpCountResetAt DateTime?  // Last time counter was reset (for daily limit tracking)

  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  @@unique([credentialType, credential])
  @@index([userId])
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

- New tables, no existing data
- Safe to deploy (no breaking changes)
- **OTPCode model removed:** Twilio Verify manages OTP codes (generation, storage, expiry, validation)
- **Rate limiting kept:** Application-level rate limiting supplements Twilio Verify's built-in limits to control SMS costs

---

## Server Actions

### `sendOTPAction(phone: string)`

**File:** `app/auth/actions.ts`

**Purpose:** Send OTP code via Twilio Verify API (form submission from phone input)

**Input:**
```typescript
{
  phone: string // E.164 format (e.g., "+14155552671")
}
```

**Output (success):**
```typescript
{
  success: true
  message: "Check your phone for a verification code"
}
```

**Output (error):**
```typescript
{
  error: string // e.g., "Invalid phone number", "Too many requests"
}
```

**Logic:**
1. Normalize phone number (strip whitespace, validate E.164)
2. Look up `Credential` by `credentialType: PHONE, credential: phone`
3. **Application-level rate limiting check (cost control):**
   - If `lastOTPSentAt` < 60 seconds ago → 429 "Wait before requesting another code"
   - If `otpCountToday` >= 5 AND `otpCountResetAt` is today → 429 "Too many requests today"
   - If `otpCountResetAt` is before today (midnight UTC): reset `otpCountToday = 0`, set `otpCountResetAt = today`
4. If credential not found:
   - Generate random display name using `unique-names-generator` (adjective + animal)
   - Create `User` with displayName
   - Create `Credential` (verifiedAt = null, credentialType = PHONE)
5. **Call Twilio Verify API to send OTP:**
   ```typescript
   await twilioClient.verify.v2
     .services(VERIFY_SERVICE_SID)
     .verifications
     .create({
       to: phone,
       channel: 'sms',
       customFriendlyName: 'turnout.network'
     })
   ```
   - Twilio generates 6-digit code, sends SMS with custom template (WebOTP format)
   - Twilio handles: code generation, expiry (10 min), single-use enforcement
6. Update `Credential`: set `lastOTPSentAt = now`, increment `otpCountToday`
7. Return success

**Validation:**
- Phone must match E.164 format: `^\+[1-9]\d{1,14}$` (use `libphonenumber-js` for normalization)

**Errors:**
- `400`: Invalid phone format
- `429`: Application rate limit exceeded (60s cooldown or 5/day limit)
- `500`: Twilio Verify API error (log full error, return generic message to user)

**Notes:**
- Twilio Verify's built-in rate limiting (configurable per Service) supplements application-level limits
- SMS message format controlled by custom template (see Prerequisites section)
- Code storage, expiry, and single-use enforcement handled by Twilio (not in database)

---

### `verifyOTPAction(phone: string, code: string)`

**File:** `app/auth/actions.ts`

**Purpose:** Verify OTP code via Twilio Verify API, create session (form submission from OTP input)

**Input:**
```typescript
{
  phone: string
  code: string // 6 digits
}
```

**Output (success):**
```typescript
{
  success: true
  redirect: "/welcome" | "/" // new user vs returning
}
```

**Output (error):**
```typescript
{
  error: string // "Invalid code", "Code expired", etc.
}
```

**Logic:**
1. Normalize phone, validate code format (4-10 digits, Twilio Verify supports configurable length)
2. **Call Twilio Verify API to check code:**
   ```typescript
   const check = await twilioClient.verify.v2
     .services(VERIFY_SERVICE_SID)
     .verificationChecks
     .create({
       to: phone,
       code: code
     })
   ```
3. **Handle Twilio response:**
   - `check.status === 'approved'` → Code valid, proceed
   - `check.status === 'pending'` → Code invalid or expired
   - API throws error → Handle specific error codes (see Errors section)
4. Look up `Credential` by phone
5. If not found → 500 "System error" (shouldn't happen - Verify succeeded but no credential exists)
6. Determine if new user: `isNewUser = (credential.verifiedAt === null)`
7. If new user: set `credential.verifiedAt = now()`
8. Generate session token (crypto.randomBytes(32).toString('hex'))
9. Create `Session` (userId, token, userAgent, ipAddress)
10. Set session cookie (httpOnly, secure, sameSite: lax, no expiration) using Next.js `cookies()` API
11. Return success with redirect (new user → `/welcome`, returning → `/`)

**Errors:**
- `400`: Invalid code format
- `401`: Invalid code (Twilio returns status 'pending')
- `410`: Code expired (Twilio API error code 60202)
- `429`: Too many verification attempts (Twilio API error code 60203)
- `500`: Twilio API error or credential lookup failure

**Notes:**
- Code validation (expiry, single-use, correctness) handled by Twilio
- No database OTPCode lookup needed
- Twilio Verify automatically prevents code reuse and enforces expiry

---

### `logoutAction()`

**File:** `app/auth/actions.ts`

**Purpose:** End session, clear cookie

**Logic:**
1. Read session token from cookie
2. If token exists: delete `Session` record
3. Clear session cookie
4. Redirect to `/login`

**Note:** Always succeeds, even if session invalid.

---

### `updateDisplayNameAction(displayName: string)`

**File:** `app/user/actions.ts`

**Purpose:** Update user's display name (authenticated)

**Input:**
```typescript
{
  displayName: string
}
```

**Output:**
```typescript
{
  success: true
  user: { id, displayName }
}
```

**Validation:**
- 1-50 chars, alphanumeric + spaces/hyphens/underscores

**Logic:**
1. Authenticate (get userId from session)
2. Validate display name
3. Update `User.displayName`
4. Return updated user

---

## API Routes

### GET /api/auth/verify-otp

**File:** `app/api/auth/verify-otp/route.ts`

**Purpose:** OTP verification endpoint for WebOTP API (browser autofill requirement)

**Why this is an API route:** WebOTP API requires a specific endpoint format that browsers can call. Cannot be a Server Action.

**Request:**
```typescript
{
  phone: string
  code: string
}
```

**Response:**
```typescript
{
  success: boolean
  redirect?: string
  error?: string
}
```

**Logic:** Calls `verifyOTPAction` internally, returns JSON response.

**Note:** This is the ONLY API route. All other auth operations use Server Actions.

---

## Frontend Components

### Pages/Routes

| Route | Component | Purpose | Auth Required |
|-------|-----------|---------|---------------|
| `/login` | `LoginPage` | Phone + OTP input form | No |
| `/welcome` | `WelcomePage` | Display name customization (new users) | Yes |

### Components

- **`PhoneInputForm`** - Phone number input (E.164 format help), submit button. Calls `sendOTPAction`, shows OTP input on success.

- **`OTPInputForm`** - 6-digit code input with WebOTP autofill support. Calls `verifyOTPAction`, redirects on success. Includes "Resend code" button (calls `sendOTPAction`, respects rate limiting).

- **`DisplayNameCustomizer`** - Shows current display name (random), input to change it, "Save"/"Skip" buttons. Calls `updateDisplayNameAction`.

- **`AuthProvider`** (context) - Wraps app, provides `user` state and `logout` function. Reads session server-side, passes to client.

### User Interactions

**Flow 1: New user authentication**

1. User lands on `/login`
2. User enters phone number
3. User submits form → calls `sendOTPAction`
4. UI shows OTP input field
5. User receives SMS with code
6. **Mobile:** Keyboard suggests code (WebOTP autofill), user taps
7. **Desktop:** User types 6-digit code
8. User submits → calls `verifyOTPAction`
9. Backend creates session, sets cookie
10. Redirect to `/welcome`
11. User customizes display name or skips
12. Navigate to `/` (home)

**Flow 2: Returning user**

Same as above, but redirect to `/` instead of `/welcome`.

**Flow 3: Rate limited**

1. User requests OTP
2. User immediately requests again
3. Server returns 429
4. UI shows: "Please wait 60 seconds before requesting another code"

---

## Auth & Permissions

**Access rules:**

- Anyone can request OTP (rate limited per phone)
- Only phone owner can verify (secret code)
- Authenticated users can update own display name
- Sessions are tied to userId

**Session security:**

- Session tokens are cryptographically random (32 chars)
- HttpOnly cookies (not accessible to JavaScript)
- Secure flag (HTTPS only) in production
- sameSite: 'lax' (CSRF protection)
- No expiration (persistent sessions per PRD)

---

## Success Criteria

After TDD0001 is implemented, the system should:

- ✅ Allow new users to authenticate via phone + OTP code
- ✅ Allow returning users to authenticate and maintain persistent sessions
- ✅ Send OTP codes via Twilio Verify API with WebOTP format
- ✅ Enforce application-level rate limits (1/min, 5/day per phone)
- ✅ Support WebOTP autofill on mobile browsers (via custom template)
- ✅ Generate random display names for new users (optional customization)
- ✅ Create database-backed sessions (persistent until logout)
- ✅ All integration tests pass (with Twilio Verify test mode)
- ✅ All E2E tests pass (with deterministic test codes)
- ✅ Deploy to dev stage and verify auth flow works end-to-end

---

## Edge Cases & Error Handling

| Scenario | Expected Behavior | Error Message |
|----------|------------------|---------------|
| Invalid phone format | Return 400 | "Invalid phone number. Use format: +1234567890" |
| Application rate limit (60s) | Return 429 | "Please wait 60 seconds before requesting another code" |
| Application rate limit (daily) | Return 429 | "Too many codes requested today. Try again tomorrow." |
| Twilio Verify rate limit | Return 429 | "Too many verification attempts. Please try again later." |
| Code expired (Twilio) | Return 410 | "This code has expired. Request a new one." |
| Code invalid (Twilio) | Return 401 | "Invalid verification code" |
| Twilio API error | Log error, return 500 | "Verification system unavailable. Please try again." |
| Display name too long | Return 400 | "Display name must be 50 characters or less" |
| Display name invalid chars | Return 400 | "Display name contains invalid characters" |

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
- Configuration: Default templates (WebOTP custom template submitted to Twilio Support, pending approval)

**SST Secrets Configured:**

Secrets are set for both development and production stages:

**Dev stage (`sdebaun`):**
- ✅ `TwilioAccountSid` - Test credentials (no SMS sent, deterministic codes)
- ✅ `TwilioAuthToken` - Test auth token
- ✅ `TwilioVerifyServiceSid` - `VA0c58bce0d3676488f1d5921156ff5d1e`
- ✅ `DatabaseUrl` - Neon database connection

**Production stage (`prod`):**
- ✅ `TwilioAccountSid` - Production credentials (real SMS delivery)
- ✅ `TwilioAuthToken` - Production auth token
- ✅ `TwilioVerifyServiceSid` - `VA0c58bce0d3676488f1d5921156ff5d1e` (same Service)
- ✅ `DatabaseUrl` - Neon production database

**Agent Verification:**
```bash
# Agents can verify secrets exist:
sst secret list --stage sdebaun
sst secret list --stage prod
```

All required secrets are present. **No blocking dependencies for implementation.**

**Test vs Production Behavior:**
- Dev stage (`sdebaun`): Uses Twilio test credentials → deterministic codes (`000000`), no SMS sent, zero cost
- Production stage (`prod`): Uses production credentials → real SMS sent, real costs (~$0.05 per verification)

**MVP ships with default template:** WebOTP custom template is a fast follow (see Post-MVP section below)

---

## Testing Strategy

**Use Twilio Verify test mode with real API calls.** Test credentials make real API calls to Twilio but don't send actual SMS or incur charges.

### Test Mode Configuration

**Verify Service in test mode:**
- Console → Verify → Services → Select Service → Settings → Enable "Test Mode"
- When enabled: Codes become deterministic (default `000000` or configurable)
- No SMS sent, zero cost, full API validation

**Magic test codes (when test mode enabled):**
- `000000` → Always succeeds
- Any other code → Fails with "invalid code" error
- Useful for testing error paths

### Integration Tests (Vitest + Docker Postgres)

**Test with real Twilio Verify API:**
```typescript
// Use test credentials + Verify Service in test mode
// Codes are deterministic (000000), no SMS sent

describe('sendOTPAction', () => {
  it('calls Verify API with correct parameters', async () => {
    const result = await sendOTPAction('+15005550006')
    expect(result.success).toBe(true)
    // Twilio Verify called but no SMS sent (test mode)
  })

  it('enforces application-level rate limiting', async () => {
    await sendOTPAction('+15005550006')
    const result = await sendOTPAction('+15005550006') // Immediate retry
    expect(result.error).toContain('Wait 60 seconds')
  })
})

describe('verifyOTPAction', () => {
  it('validates correct code via Verify API', async () => {
    await sendOTPAction('+15005550006')
    const result = await verifyOTPAction('+15005550006', '000000') // Test mode code
    expect(result.success).toBe(true)
  })

  it('rejects invalid code', async () => {
    await sendOTPAction('+15005550006')
    const result = await verifyOTPAction('+15005550006', '123456')
    expect(result.error).toContain('Invalid')
  })
})
```

**Required tests:**
- `sendOTPAction` calls Verify API successfully
- `sendOTPAction` enforces application rate limiting (60s cooldown, 5/day limit)
- `sendOTPAction` handles Verify API errors gracefully
- `verifyOTPAction` validates correct code (test mode: 000000)
- `verifyOTPAction` rejects invalid codes
- `verifyOTPAction` creates session and sets verifiedAt
- `logoutAction` deletes session
- `updateDisplayNameAction` requires auth

### E2E Tests (Playwright)

**Test with Verify test mode:**
```typescript
// Playwright tests use same test credentials
// Use deterministic code 000000 in test mode

test('new user authentication flow', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[name="phone"]', '+15005550006')
  await page.click('button[type="submit"]')

  // OTP input appears
  await page.fill('input[name="code"]', '000000') // Test mode code
  await page.click('button[type="submit"]')

  // Redirects to welcome page
  await expect(page).toHaveURL('/welcome')
})
```

**Required tests:**
- New user flow: enter phone → enter test code (000000) → customize name → see home
- Returning user flow: enter phone → enter test code → see home (skip welcome)
- Rate limit flow: request code → immediately request again → see error
- Invalid code flow: enter wrong code → see error

**WebOTP autofill:**
- Cannot test WebOTP keyboard autofill in automated tests (requires real mobile device)
- Verify message format matches spec via Twilio Console template preview
- Manual testing on real device recommended post-deploy

### What's NOT Tested (Acceptable for MVP)

- ❌ Real SMS delivery (test mode doesn't send SMS)
- ❌ WebOTP keyboard autofill (requires real mobile device)
- ❌ Carrier spam filtering (no real SMS sent)
- ❌ 10DLC compliance (production concern)

**Post-deploy validation:**
- Monitor Twilio Verify dashboard for delivery rates (should be >95% in production)
- Monitor auth completion rates (percentage of users who complete OTP flow)
- User feedback on WebOTP autofill behavior

---

## Decisions Made

All open questions resolved:

- ✅ **Display name library:** Use `unique-names-generator` npm package (well-maintained, configurable, simple API)
- ✅ **Phone normalization library:** Use `libphonenumber-js` (handles international formats correctly, validates properly, 200KB is acceptable for MVP)
- ✅ **Twilio error handling:** Fail gracefully and log errors (don't expose Twilio details to users, monitor via Sentry)
- ✅ **Session token rotation:** Static tokens (simpler, matches PRD requirement for persistent sessions, can add rotation post-MVP if needed)
- ✅ **Display name uniqueness:** Allow duplicates (simpler, not required by PRD, users can customize if they want unique names)
- ✅ **Rate limit reset logic:** Daily counter resets at midnight UTC (compare `new Date().toDateString()` for "same day" check)
- ✅ **OTP delivery method:** Twilio Verify API instead of raw SMS (better deliverability, simpler code, built-in security features)
- ✅ **WebOTP format:** Custom Verify template with domain-bound format (`@turnout.network #{{code}}`)
- ✅ **Code storage:** Twilio manages codes (no OTPCode table, no cleanup cron needed)

---

## NPM Dependencies

**Required packages:**
```bash
pnpm add twilio libphonenumber-js unique-names-generator
pnpm add -D @types/node
```

**Packages:**
- `twilio` - Twilio SDK for Verify API
- `libphonenumber-js` - Phone number validation and normalization
- `unique-names-generator` - Random display name generation (adjective + animal)

---

## Post-MVP Fast Follow: WebOTP Custom Template

**Current state (MVP):** Uses Twilio Verify default template
- Message format: `"Your turnout-network verification code is: 123456"`
- Users manually type 6-digit code (no keyboard autofill on mobile)
- Auth flow works identically, just without autofill UX enhancement

**Fast follow (1-2 days post-MVP):** Request and configure custom WebOTP template

**Steps:**
1. **Submit Twilio Support ticket** requesting custom verification template
   - Account SID: [from Console]
   - Verify Service SID: `VA0c58bce0d3676488f1d5921156ff5d1e`
   - Desired message body:
     ```
     {{code}} is your {{friendly_name}} verification code.
     @turnout.network #{{code}}
     ```
   - Template name: "Turnout WebOTP"
   - Locale: en-US

2. **Wait for approval** (~1-2 business days)
   - Twilio reviews and approves template
   - Provides Template SID (starts with `HJ...`)

3. **Configure template** (two options):
   - **Option A:** Set as default in Verify Service settings (Console → Service → Message Templates)
   - **Option B:** Pass `templateSid` parameter in `verifications.create()` API call

4. **Verify WebOTP works:**
   - Send test verification to real mobile device (iOS 14+ or Android Chrome 84+)
   - Confirm keyboard suggests code automatically
   - Confirm tapping suggestion fills input

**Code changes required:** ZERO
- If using Option A (default template): No code changes
- If using Option B (templateSid param): One-line change to add parameter

**Impact:** Mobile users get one-tap autofill instead of manual typing. Desktop users unaffected (WebOTP not supported).

---

## Related Context

- **PRD:** prd0001-phone-identity.md
- **Roadmap Phase:** MVP Week 1 (foundational)
- **Related TDDs:** None (all features depend on this)
- **Dependencies:** Twilio Verify API, Neon Postgres, SST + AWS
- **Architecture Decision:** Switched from raw Twilio SMS to Twilio Verify API for better deliverability, simpler implementation, and built-in security features
