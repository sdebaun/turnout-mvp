# TDD: Phone-Based Identity System

**PRD:** prd0001-phone-identity.md
**Status:** Draft
**Last Updated:** 2026-02-14 (Revised: OTP codes, Server Actions, SST)

## Context

_What I found:_

- **Vision alignment:** "Open Door Principle" - prioritize accessibility over hardened security. Frictionless auth matches this philosophy.
- **Roadmap phase:** MVP Week 1, first initiative, foundational for all features.
- **Architecture constraints:** Next.js App Router, Server Components + Server Actions (default), Prisma + Postgres (Neon), SST on AWS, Twilio SMS. TypeScript throughout.
- **Key PRD design hints:**
  - OTP codes (10-min expiry, 6 digits) chosen over magic links for better SMS deliverability
  - WebOTP API for one-tap autofill on mobile
  - Credential-agnostic design (support future email via `credentials` table)
  - Database-backed sessions for future session management
  - Persistent sessions (no expiration)

---

## Overview

**Problem:** Users need frictionless authentication for sporadic usage patterns (might return weeks later) without passwords.

**Solution:** Phone-based OTP codes via SMS. Phone number = identity. Enter 6-digit code (or tap autofill on mobile), get persistent session, optionally customize display name.

**Scope:**
- ✅ Phone number authentication (E.164 format)
- ✅ SMS OTP codes (10-min expiry, single-use, 6 digits)
- ✅ WebOTP API (one-tap autofill on mobile)
- ✅ Persistent sessions (database-backed)
- ✅ Random display name generation (optional override)
- ✅ Rate limiting (prevent SMS spam)
- ❌ Email authentication (future)
- ❌ Session expiration (future, if needed)
- ❌ 2FA/MFA (future)

---

## Components

**What this touches:**

- [x] Database (Prisma schema - 4 new models)
- [x] Server Actions (send OTP, verify OTP, logout, update display name)
- [x] API route (OTP verification for WebOTP API)
- [x] Frontend (phone + OTP input, WebOTP autofill, display name customization)
- [x] Background jobs (EventBridge cron for token cleanup)
- [x] Auth/permissions (this IS the auth system)

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
  otpCodes    OTPCode[]
}

// Credentials table (future-proof for email)
model Credential {
  id           String         @id @default(cuid())
  userId       String
  user         User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  credentialType CredentialType // PHONE or EMAIL (future)
  credential     String         // Phone number (E.164) or email
  verifiedAt     DateTime?      // Null until OTP verified

  // Rate limiting fields
  lastOTPSentAt   DateTime?
  otpCountToday   Int        @default(0)

  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  @@unique([credentialType, credential])
  @@index([userId])
}

// OTP codes (10-min expiry, single-use)
model OTPCode {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  code      String    // 6-digit numeric code
  expiresAt DateTime  // 10 minutes from creation
  usedAt    DateTime? // Null until verified, prevents replay

  createdAt DateTime  @default(now())

  @@index([userId, code]) // Lookup by userId + code
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
- Consider index on `OTPCode.expiresAt` if cleanup queries slow down

---

## Server Actions

### `sendOTPAction(phone: string)`

**File:** `app/auth/actions.ts`

**Purpose:** Send OTP code via SMS (form submission from phone input)

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
3. **Rate limiting check:**
   - If `lastOTPSentAt` < 60 seconds ago → 429 "Wait before requesting another code"
   - If `otpCountToday` >= 5 → 429 "Too many requests today"
   - Reset `otpCountToday` if last request was yesterday
4. If credential not found:
   - Generate random display name (adjective + animal)
   - Create `User` with displayName
   - Create `Credential` (verifiedAt = null, credentialType = PHONE)
5. Generate 6-digit OTP code (random numeric)
6. Create `OTPCode` (userId, code, expiresAt = now + 10 min)
7. Send SMS via Twilio:
   - Message: `@turnout.network #123456\n\nYour verification code is 123456`
   - Format enables WebOTP autofill
8. Update `Credential`: set `lastOTPSentAt = now`, increment `otpCountToday`
9. Return success

**Validation:**
- Phone must match E.164 format: `^\+[1-9]\d{1,14}$`

**Errors:**
- `400`: Invalid phone format
- `429`: Rate limit exceeded
- `500`: SMS delivery failed (log, investigate Twilio)

---

### `verifyOTPAction(phone: string, code: string)`

**File:** `app/auth/actions.ts`

**Purpose:** Verify OTP code, create session (form submission from OTP input)

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
1. Normalize phone, validate code (6 digits)
2. Look up `Credential` by phone
3. If not found → 404 "Invalid phone number"
4. Look up `OTPCode` where `userId = credential.userId, code = code`
5. **Validation:**
   - Code not found → 401 "Invalid verification code"
   - `expiresAt < now()` → 410 "Code expired"
   - `usedAt !== null` → 410 "Code already used"
6. Mark code as used: set `usedAt = now()`
7. Determine if new user: `isNewUser = (credential.verifiedAt === null)`
8. If new user: set `credential.verifiedAt = now()`
9. Generate session token (crypto.randomBytes, 32 chars hex)
10. Create `Session` (userId, token, userAgent, ipAddress)
11. Set session cookie (httpOnly, secure, sameSite: lax, no expiration)
12. Return success with redirect (new user → `/welcome`, returning → `/`)

**Errors:**
- `400`: Invalid code format
- `401`: Invalid code
- `410`: Code expired or already used

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

## Edge Cases & Error Handling

| Scenario | Expected Behavior | Error Message |
|----------|------------------|---------------|
| Invalid phone format | Return 400 | "Invalid phone number. Use format: +1234567890" |
| Rate limit (time) | Return 429 | "Please wait 60 seconds before requesting another code" |
| Rate limit (daily) | Return 429 | "Too many codes requested today. Try again tomorrow." |
| Code expired | Return 410 | "This code has expired. Request a new one." |
| Code already used | Return 410 | "This code has already been used. Request a new one." |
| Code not found | Return 401 | "Invalid verification code" |
| SMS delivery failure | Log error, return success | "Check your phone for a verification code" (don't leak info) |
| Display name too long | Return 400 | "Display name must be 50 characters or less" |
| Display name invalid chars | Return 400 | "Display name contains invalid characters" |

**Validation rules:**

- [ ] Phone must match E.164 format: `^\+[1-9]\d{1,14}$`
- [ ] OTP requests limited to 1 per 60 seconds per phone
- [ ] OTP requests limited to 5 per day per phone
- [ ] OTP codes expire after 10 minutes
- [ ] OTP codes are single-use (usedAt prevents replay)
- [ ] Display name must be 1-50 chars, alphanumeric + spaces/hyphens/underscores

---

## Background Jobs

**Job:** Clean up expired OTP codes

- **Schedule:** Daily at 3:00 AM UTC
- **Purpose:** Delete old OTPCodes to prevent DB bloat
- **Implementation:** EventBridge rule → Lambda function
- **SST Config:** `sst.aws.Cron("CleanupOTP", { schedule: "cron(0 3 * * ? *)", job: "src/cron/cleanup-otp.handler" })`

**Logic:**
```typescript
// Delete codes older than 7 days (keep recent for debugging)
await prisma.otpCode.deleteMany({
  where: {
    expiresAt: {
      lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    }
  }
})
```

**Note:** Do NOT auto-delete Sessions (persistent sessions per PRD).

---

## Testing Requirements

### Integration Tests (Vitest + Docker Postgres)

**Required tests:**
- `sendOTPAction` creates OTP code and sends SMS
- `sendOTPAction` enforces rate limiting (time + daily)
- `verifyOTPAction` validates correct code
- `verifyOTPAction` rejects expired codes
- `verifyOTPAction` rejects used codes
- `verifyOTPAction` creates session and sets verifiedAt
- `logoutAction` deletes session
- `updateDisplayNameAction` requires auth
- Cron job deletes expired OTP codes

### E2E Tests (Playwright via MCP)

**Required tests:**
- New user flow: enter phone → receive code → enter code → customize name → see home
- Returning user flow: enter phone → enter code → see home (skip welcome)
- Rate limit flow: request code → immediately request again → see error
- WebOTP autofill (mobile simulation): code auto-suggests in keyboard

**Agent team workflow:** Write tests, run via Playwright MCP, debug failures, commit with passing tests.

---

## Open Questions

- [ ] **Display name library:** Use `unique-names-generator` or custom word lists? - Library is simpler.
- [ ] **Phone normalization library:** Use `libphonenumber-js` (200KB) or simple regex? - Library handles edge cases.
- [ ] **Twilio error handling:** Pre-check account balance or fail gracefully? - Fail gracefully + alert.
- [ ] **Session token rotation:** Rotate periodically or keep static? - Static is simpler, matches PRD.
- [ ] **Display name uniqueness:** Enforce unique names or allow duplicates? - PRD doesn't mention, assume duplicates OK.

---

## Related Context

- **PRD:** prd0001-phone-identity.md
- **Roadmap Phase:** MVP Week 1 (foundational)
- **Related TDDs:** None (all features depend on this)
- **Dependencies:** Twilio SMS API, Neon Postgres, SST + AWS
