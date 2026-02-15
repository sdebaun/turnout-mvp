# PRD: Phone-Based Identity System

**Status:** MVP (Approved for build - revised to use OTP instead of magic links)
**Owner:** Solo Founder
**Last Updated:** 2026-02-14 (Revised: switched from magic links to OTP codes for better SMS deliverability)
**Target Release:** MVP Week 1
**Availability:** All users (organizers and participants)
**Rationale:** Universal authentication is foundational—everyone needs it to use the platform.

---

## Context

_What I found in your files:_

- **Roadmap:** Phone-based identity is the **first MVP initiative** (1 week effort). It's foundational with no dependencies. Drives the outcome "Organizers return, durability" and enables all subsequent features.
- **Vision:** The "Open Door Principle" states that turnout.network "prioritizes participation over protection" and is "open by design—and fragile by necessity." You're explicitly NOT building hardened security infrastructure—you're building something accessible and easy to use.
- **User stories:**
  - Alice (first-time participant) enters her phone number, gets an SMS with a verification code, enters the code (or taps auto-suggest on mobile), and is immediately authenticated. She can optionally customize her display name from a random suggestion like "BlueWombat."
  - Bob (first-time organizer) follows the same flow—phone verification via OTP code, then optional display name customization.
- **Architecture:** Technical stack already decided: Twilio for SMS (~$0.0079/message), OTP codes with 10-min expiry and single-use validation, persistent sessions (don't expire unless user explicitly logs out). WebOTP API enables one-tap autofill on mobile. Rationale: "Sporadic usage patterns, phone number is the weak point anyway, accessibility over hardened security. OTP chosen over magic links for better SMS deliverability (no URLs = lower spam scoring with 10DLC)."
- **Strategic fit:** Solo founder, free-tier constraints (<$50/month), validation focus. Security is "good enough" for low-risk MVP organizing, not hardened for high-stakes activism.

---

## Problem

**What problem are we solving?**
People need a way to authenticate and maintain identity across the platform—both organizers creating turnouts and participants RSVPing to them. Authentication must be:

1. **Universal:** Works for everyone, regardless of technical sophistication
2. **Frictionless:** No barriers to entry (no passwords to remember, no email verification delays)
3. **Persistent:** Users don't want to re-authenticate every time they return (sporadic usage patterns—might organize/attend once a month)
4. **Device-agnostic:** Works across phones, tablets, desktops without requiring app installs
5. **Cost-effective:** Free-tier viable (can't afford per-user authentication costs)

**Who experiences this problem?**

- **Alice (first-time participant):** Gets a turnout link from a friend, wants to RSVP in <30 seconds without creating an account or remembering a password
- **Bob (first-time organizer):** Wants to create a turnout and share it without friction—needs persistent access to manage RSVPs over time
- **Both:** May return weeks or months later and expect to still be logged in

**In what situation?**

- Alice clicks an RSVP link while standing on a street corner—she's on mobile, distracted, and has never used the platform before
- Bob creates a turnout on his phone Thursday night, then checks RSVPs from his laptop on Saturday morning—needs seamless cross-device access
- Neither has time or patience for "create an account, verify your email, set a password, enable 2FA" flows

---

## Evidence

✅ **Validated:**

- **Vision doc explicitly prioritizes accessibility over security:** "Open Door Principle: turnout.network prioritizes participation over protection... We don't promise secrecy or strong identity guarantees. It's open by design—and fragile by necessity."
- **User stories show phone-first flows:** Alice and Bob both authenticate via SMS verification codes—no mention of passwords or email verification
- **Architecture doc confirms sporadic usage:** "Sporadic usage patterns, phone number is the weak point anyway, accessibility over hardened security"
- **MVP success metrics require low friction:** ROADMAP.md targets "<24 hours from turnout creation to first RSVP"—can't hit this with high-friction auth
- **10DLC spam filtering is real:** US carriers score SMS messages with URLs higher for spam. OTP codes (no URLs) have better deliverability than magic links. Critical for hitting ≥95% SMS delivery target.
- **WebOTP is widely supported:** Chrome on Android (v84+), Safari on iOS (v14+) both support automatic OTP detection and autofill. Makes mobile UX nearly identical to magic links (one-tap).

⚠️ **Assumed:**

- Users will accept phone-number-based identity (no email option) → **Risk:** Privacy-conscious users may reject this
- Persistent sessions (no expiry) won't cause security issues in MVP → **Risk:** Account takeover if phone is stolen/compromised
- SMS delivery will be reliable enough (95%+ target) → **Risk:** Carrier blocking, international delivery failures

---

## Success Criteria

### Lagging Indicators (post-launch outcomes)

| Metric                              | Current | Target | Timeframe    |
| ----------------------------------- | ------- | ------ | ------------ |
| SMS delivery rate                   | 0%      | ≥95%   | MVP launch   |
| Auth latency (form submit → SMS rx) | N/A     | <5 sec | MVP launch   |
| Session persistence (cross-visit)   | N/A     | 100%   | MVP launch   |
| OTP code reuse attempts blocked     | 0       | 0      | MVP lifetime |

### Leading Indicators (pre-launch signals)

| Metric                                        | Current | Target | What This Predicts                       |
| --------------------------------------------- | ------- | ------ | ---------------------------------------- |
| Twilio SMS delivery success in dev/stage      | N/A     | ≥98%   | Production delivery reliability          |
| Auth flow completion rate (phone → code entry)| N/A     | ≥90%   | Real users will complete RSVP flow       |
| WebOTP autofill success rate (mobile)         | N/A     | ≥80%   | Mobile UX is one-tap (like magic links)  |
| Session cookie persistence in testing         | N/A     | 100%   | Users won't get logged out unexpectedly  |
| OTP generation/validation speed               | N/A     | <100ms | Auth won't bottleneck turnout creation    |

💡 **Leading indicators help you course-correct before launch.** If Twilio delivery fails in staging, fix SMS provider issues before going live.

---

## Proposed Solution

### How It Works

**Universal phone-based authentication** where phone number = identity. No passwords, no email verification, no account creation friction.

**What data is required:**
- Phone number (used as permanent identity)
- Display name (optional, randomly generated if not provided)

**What outputs are provided:**
- Authenticated session (persists across visits until explicit logout)
- User identity (linked to phone number)
- SMS delivery confirmation

**Key constraints:**
- SMS delivery required (6-digit OTP code sent via text message)
- 10-minute verification window (prevents stale codes)
- Single-use verification (code invalidated after successful use)
- WebOTP API format required (enables one-tap autofill on Android/iOS)
- SMS must include domain hint for autofill: `@turnout.network #123456`

**User experience flow:**
User provides phone → Receives SMS with 6-digit code → Enters code (or taps autofill suggestion on mobile) → Authenticated session created → Optional display name customization → Ready to use platform

**Key decisions:**

- **Phone number as identity:** No email, no username, no password. Phone is the universal identifier.
- **Persistent sessions:** Sessions don't expire—users stay logged in until they explicitly log out. Optimizes for sporadic usage (might return weeks later).
- **OTP codes instead of magic links:** Better SMS deliverability (no URLs = lower 10DLC spam scoring), works cross-device (type code on desktop, got SMS on phone), no browser-mismatch issues. WebOTP API makes mobile UX nearly identical to magic links (one-tap autofill).
- **Random display names by default:** Protects privacy (you can RSVP as "OrangeArmadillo"), but users can override with real names if they want.

### User Stories (Examples)

**Story 1: Alice RSVPs to her first turnout**

- **As a** first-time participant who just received a turnout link from a friend
- **I want to** RSVP with just my phone number and a verification code (auto-suggested on mobile)
- **So that** I can commit to showing up in <30 seconds without creating an account or remembering credentials

**Story 2: Bob creates a turnout and returns later to manage it**

- **As an** organizer who created a turnout on my phone Thursday night
- **I want to** check RSVPs from my laptop Saturday morning without re-authenticating
- **So that** I can manage my turnout across devices without friction

**Story 3: Alice protects her privacy with a pseudonym**

- **As a** participant concerned about privacy
- **I want to** RSVP using a randomly generated display name instead of my real name
- **So that** I can commit to showing up without doxxing myself publicly

---

## Non-Goals

What we're explicitly **NOT** doing in MVP:

- **No email-based authentication** — Phone-only for MVP. If users reject phone numbers, we'll add email in "Next" phase.
- **No password option** — OTP codes only. No "create a password" flow.
- **No session expiration** — Cookies persist until explicit logout. Post-MVP: add "view active sessions, remote logout" if security becomes an issue.
- **No 2FA or MFA** — Phone number + OTP code is the only factor. If high-stakes organizing requires stronger auth, add in "Later" phase.
- **No social login (Google, Facebook, etc.)** — Phone-only for MVP (we need phone numbers for SMS reminders). Social login could be added later as an **alternative auth method** (for convenience on new devices), but phone number remains required. Deferred to "Later" if users complain about OTP friction.
- **No account recovery flow** — If you lose access to your phone number, you lose your account. Document this clearly in UI. Post-MVP: add phone number transfer flow if users complain.
- **No role-based permissions** — All authenticated users have equal capabilities (organizers can organize, participants can RSVP). RBAC deferred to post-MVP.

---

## Future Considerations

_These features are not in scope for MVP, but are likely enough in the near term that they should influence your architectural decisions today. Don't over-engineer for them, but don't paint yourself into a corner either._

| Future Capability | Likelihood | Design Hint |
| ----------------- | ---------- | ----------- |
| **Email authentication** | High (Next phase) | Design auth system to support **multiple credential types** (phone, email) even though MVP only implements phone. Use a `credentials` table with `credential` + `credential_type` fields instead of hardcoding `phone_number` on the `users` table. Don't couple OTP generation to SMS—make it transport-agnostic (SMS, email). Example: `sendOTP(credential, transport)` not `sendSMSOTP(phoneNumber)`. |
| **Session management (view/revoke)** | High (Next phase) | Store sessions in **database instead of cookie-only**, so we can build "view active sessions, remote logout" later without a migration. Include `created_at`, `last_active_at`, `user_agent`, `ip_address` fields from day one—even if MVP doesn't use them. Cost is negligible, rework cost is high. |
| **Phone number transfer** | Medium (Later phase) | Separate **user identity (immutable UUID) from phone number (can change)**. Don't use phone number as foreign key in other tables—use `user_id`. When a user changes phone number, it should be an UPDATE to the credentials table, not creating a new user. Make phone number updates a DB transaction with proper constraints. |
| **Account recovery flow** | Medium (Later phase) | When a user loses access to phone number, we'll need a way to verify ownership and transfer to new number. Consider storing `phone_number_verified_at` timestamp. Add optional `backup_email` field (nullable, not required for MVP) so we have a recovery path later. Don't build the recovery flow, just leave the door open. |
| **2FA / MFA** | Low (Later phase, high-stakes organizing) | Don't assume single-factor auth forever. Make auth flow **pluggable**—consider strategy pattern where OTP is one strategy, TOTP could be another. Don't tightly couple session creation to OTP validation. Example: `authenticateUser(userId, authMethod)` not `createSessionFromOTP(code)`. |
| **OAuth / Social Login** | Low (Later phase, if demanded) | If users demand "Sign in with Google" later, you'll need to support multiple auth providers. This reinforces the `credentials` table design above—Google OAuth would just be another credential type. Keep auth provider logic separate from user identity logic. |

💡 **The pattern:** Make auth **credential-agnostic** and **transport-agnostic** from day one, even though MVP only uses phone + SMS OTP. This costs almost nothing now but saves weeks of refactoring later.

---

## Dependencies

### Feature Dependencies

- **None** — This is the foundational feature. All other MVP features depend on this.

### Team Dependencies

- **Solo founder** — No external team dependencies

### External Dependencies

- **Twilio SMS API:** Required for OTP code delivery. **Risk if delayed:** Auth doesn't work without SMS. **Mitigation:** Set up Twilio account in week 0 (before dev starts), verify SMS delivery and 10DLC spam filtering in dev/stage environments.
- **WebOTP API (browser standard):** Enables one-tap OTP autofill on mobile (Chrome Android v84+, Safari iOS v14+). **Risk if unavailable:** Mobile UX degrades to manual code entry, but flow still works. **Mitigation:** Implement with progressive enhancement (autofill if supported, manual entry as fallback).
- **Domain + HTTPS certificate:** Required for WebOTP API and secure sessions. **Risk if delayed:** WebOTP won't work without HTTPS. **Mitigation:** Vercel provides automatic HTTPS, so no blocker.

**Critical Path:** **Twilio SMS API** — If Twilio delivery fails or account gets suspended, the entire MVP breaks. This is the single point of failure. WebOTP is nice-to-have (degrades to manual entry).

💡 **Flag dependencies early to avoid last-minute surprises.** Test Twilio in dev/stage before going live.

---

## Risks

_Risk types: V=Value, U=Usability, F=Feasibility, B=Business Viability. Impact: H=High, M=Medium, L=Low_

| Risk                                                                 | Type | Impact | Mitigation                                                                                                                                        |
| -------------------------------------------------------------------- | ---- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Users reject phone-number-only auth (privacy concerns)               | V    | H      | **Validate assumption with pilot users.** If rejected, add email option in "Next" phase. For MVP, accept the risk—vision doc prioritizes access. |
| SMS delivery failures (10DLC spam filtering, carrier blocking)       | F    | H      | **OTP codes (no URLs) have better deliverability than magic links.** Use Twilio with proper 10DLC registration, opt-in language. Monitor delivery rates. If <95%, investigate carrier/spam filter issues. |
| OTP code interception / account takeover                             | B    | M      | Short code expiry (10min), single-use codes, rate limiting. Document risk clearly: "If someone has access to your SMS, they can access your account." |
| Persistent sessions enable account takeover if phone is stolen       | B    | M      | Accept risk for MVP—aligns with "open door" principle. Post-MVP: add "view sessions, remote logout" feature.                                     |
| SMS costs spiral with spam signups                                   | B    | M      | Rate limiting (max N SMS per phone number per hour), honeypot fields, block disposable phone numbers (Twilio lookup API).                        |
| Users lose access to phone number (can't recover account)            | U    | M      | Document clearly in UI: "Your phone number is your identity. If you lose access, you lose your account." Post-MVP: add phone number transfer flow. |
| Non-expiring sessions feel insecure to security-conscious users      | V    | L      | Explain rationale in UI: "You stay logged in until you log out—perfect for returning weeks later." If users complain, add optional session expiry. |
| WebOTP autofill doesn't work (browser compatibility issues)          | U    | L      | Fallback to manual code entry still works. Test on Chrome Android, Safari iOS. If autofill fails, UX degrades but doesn't break flow.            |

---

## Open Questions

_For each unknown, suggest a validation approach to turn assumptions into testable hypotheses._

| Question                                                                   | Assumption                                                     | How to Validate                                                                                        | Timeline           |
| -------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------ |
| Will privacy-conscious users reject phone-number-only auth?                | Most users will accept it; small % will reject                | Test with 5-10 pilot users (mix of privacy-conscious and general population). Ask: "Would you use this?" | Before dev starts  |
| Will SMS delivery be reliable enough (95%+) across carriers with OTP codes? | Twilio + OTP (no URLs) passes 10DLC filtering                | Send test SMS to 10+ phone numbers across carriers (AT&T, Verizon, T-Mobile) in dev/stage. Monitor spam filtering. | Week 1 (dev)       |
| Will WebOTP autofill work reliably on mobile (one-tap UX)?                 | Yes, Chrome Android & Safari iOS support it                   | Test on real devices (Android + iOS). Observe: does keyboard suggest the code? Do users tap it or type manually? | Week 2-3 (staging) |
| Will users understand OTP code entry flow without explicit instructions?   | Yes, OTP is familiar from 2FA                                  | Observe 3-5 users going through RSVP flow. Do they enter the code without help? How many use autofill vs manual entry? | Week 2-3 (staging) |
| Will non-expiring sessions cause security complaints from organizers?      | No complaints for low-risk MVP organizing                     | Monitor support requests and user feedback in first 30 days post-launch                                | Post-MVP launch    |
| Can we block disposable phone numbers (e.g., Burner, Google Voice) to prevent spam? | Twilio Lookup API can detect disposable numbers       | Test Twilio Lookup API in dev—check accuracy and cost per lookup                                      | Week 1 (dev)       |

---



