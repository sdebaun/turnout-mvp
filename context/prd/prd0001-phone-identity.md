# PRD: Phone-Based Identity System

**Status:** MVP (Approved for build)
**Owner:** Solo Founder
**Last Updated:** 2026-02-14
**Target Release:** MVP Week 1
**Availability:** All users (organizers and participants)
**Rationale:** Universal authentication is foundational—everyone needs it to use the platform.

---

## Context

_What I found in your files:_

- **Roadmap:** Phone-based identity is the **first MVP initiative** (1 week effort). It's foundational with no dependencies. Drives the outcome "Organizers return, durability" and enables all subsequent features.
- **Vision:** The "Open Door Principle" states that turnout.network "prioritizes participation over protection" and is "open by design—and fragile by necessity." You're explicitly NOT building hardened security infrastructure—you're building something accessible and easy to use.
- **User stories:**
  - Alice (first-time participant) enters her phone number, gets an SMS with "click here to confirm!", and is immediately authenticated. She can optionally customize her display name from a random suggestion like "BlueWombat."
  - Bob (first-time organizer) follows the same flow—phone verification, then optional display name customization.
- **Architecture:** Technical stack already decided: Twilio for SMS (~$0.0079/message), magic links with 15-min expiry and single-use tokens, persistent sessions (don't expire unless user explicitly logs out). Rationale: "Sporadic usage patterns, phone number is the weak point anyway, accessibility over hardened security."
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
- **User stories show phone-first flows:** Alice and Bob both authenticate via SMS magic links—no mention of passwords or email verification
- **Architecture doc confirms sporadic usage:** "Sporadic usage patterns, phone number is the weak point anyway, accessibility over hardened security"
- **MVP success metrics require low friction:** ROADMAP.md targets "<24 hours from turnout creation to first RSVP"—can't hit this with high-friction auth

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
| Magic link replay attacks           | 0       | 0      | MVP lifetime |

### Leading Indicators (pre-launch signals)

| Metric                                    | Current | Target | What This Predicts                       |
| ----------------------------------------- | ------- | ------ | ---------------------------------------- |
| Twilio SMS delivery success in dev/stage  | N/A     | ≥98%   | Production delivery reliability          |
| Auth flow completion rate (phone → click) | N/A     | ≥90%   | Real users will complete RSVP flow       |
| Session cookie persistence in testing     | N/A     | 100%   | Users won't get logged out unexpectedly  |
| Token generation/validation speed         | N/A     | <100ms | Auth won't bottleneck turnout creation    |

💡 **Leading indicators help you course-correct before launch.** If Twilio delivery fails in staging, fix SMS provider issues before going live.

---

## Proposed Solution

### How It Works

**Universal phone-based magic link authentication** where phone number = identity. No passwords, no email verification, no account creation friction.

**Flow:**

1. User enters phone number (organizer creating turnout, or participant RSVPing)
2. System generates cryptographically secure magic link token (random, single-use, 15-min expiry)
3. SMS sent via Twilio: "Tap to continue: [magic link]"
4. User clicks link → authenticated session created (persistent cookie, no expiration)
5. User can optionally customize display name (default: randomly generated like "BlueWombat")

**Key decisions:**

- **Phone number as identity:** No email, no username, no password. Phone is the universal identifier.
- **Persistent sessions:** Cookies don't expire—users stay logged in until they explicitly log out. Optimizes for sporadic usage (might return weeks later).
- **Magic links instead of OTP codes:** Tap-to-authenticate is faster than "copy 6-digit code, paste, submit." Reduces friction.
- **Random display names by default:** Protects privacy (you can RSVP as "OrangeArmadillo"), but users can override with real names if they want.

### User Stories (Examples)

**Story 1: Alice RSVPs to her first turnout**

- **As a** first-time participant who just received a turnout link from a friend
- **I want to** RSVP with just my phone number and one SMS click
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
- **No password option** — Magic links only. No "create a password" flow.
- **No session expiration** — Cookies persist until explicit logout. Post-MVP: add "view active sessions, remote logout" if security becomes an issue.
- **No 2FA or MFA** — Phone number + magic link is the only factor. If high-stakes organizing requires stronger auth, add in "Later" phase.
- **No social login (Google, Facebook, etc.)** — Adds complexity, vendor dependencies, and doesn't align with "phone as universal identity" principle.
- **No account recovery flow** — If you lose access to your phone number, you lose your account. Document this clearly in UI. Post-MVP: add phone number transfer flow if users complain.
- **No role-based permissions** — All authenticated users have equal capabilities (organizers can organize, participants can RSVP). RBAC deferred to post-MVP.

---

## Future Considerations

_These features are not in scope for MVP, but are likely enough in the near term that they should influence your architectural decisions today. Don't over-engineer for them, but don't paint yourself into a corner either._

| Future Capability | Likelihood | Design Hint |
| ----------------- | ---------- | ----------- |
| **Email authentication** | High (Next phase) | Design auth system to support **multiple credential types** (phone, email) even though MVP only implements phone. Use a `credentials` table with `credential` + `credential_type` fields instead of hardcoding `phone_number` on the `users` table. Don't couple magic link generation to SMS—make it transport-agnostic (SMS, email). Example: `sendMagicLink(credential, transport)` not `sendSMSMagicLink(phoneNumber)`. |
| **Session management (view/revoke)** | High (Next phase) | Store sessions in **database instead of cookie-only**, so we can build "view active sessions, remote logout" later without a migration. Include `created_at`, `last_active_at`, `user_agent`, `ip_address` fields from day one—even if MVP doesn't use them. Cost is negligible, rework cost is high. |
| **Phone number transfer** | Medium (Later phase) | Separate **user identity (immutable UUID) from phone number (can change)**. Don't use phone number as foreign key in other tables—use `user_id`. When a user changes phone number, it should be an UPDATE to the credentials table, not creating a new user. Make phone number updates a DB transaction with proper constraints. |
| **Account recovery flow** | Medium (Later phase) | When a user loses access to phone number, we'll need a way to verify ownership and transfer to new number. Consider storing `phone_number_verified_at` timestamp. Add optional `backup_email` field (nullable, not required for MVP) so we have a recovery path later. Don't build the recovery flow, just leave the door open. |
| **2FA / MFA** | Low (Later phase, high-stakes organizing) | Don't assume single-factor auth forever. Make auth flow **pluggable**—consider strategy pattern where magic link is one strategy, TOTP could be another. Don't tightly couple session creation to magic link validation. Example: `authenticateUser(userId, authMethod)` not `createSessionFromMagicLink(token)`. |
| **OAuth / Social Login** | Low (Later phase, if demanded) | If users demand "Sign in with Google" later, you'll need to support multiple auth providers. This reinforces the `credentials` table design above—Google OAuth would just be another credential type. Keep auth provider logic separate from user identity logic. |

💡 **The pattern:** Make auth **credential-agnostic** and **transport-agnostic** from day one, even though MVP only uses phone + SMS. This costs almost nothing now but saves weeks of refactoring later.

---

## Dependencies

### Feature Dependencies

- **None** — This is the foundational feature. All other MVP features depend on this.

### Team Dependencies

- **Solo founder** — No external team dependencies

### External Dependencies

- **Twilio SMS API:** Required for magic link delivery. **Risk if delayed:** Auth doesn't work without SMS. **Mitigation:** Set up Twilio account in week 0 (before dev starts), verify SMS delivery in dev/stage environments.
- **Domain + HTTPS certificate:** Magic links must be HTTPS-only for security. **Risk if delayed:** Can't send secure links. **Mitigation:** Vercel provides automatic HTTPS, so no blocker.

**Critical Path:** **Twilio SMS API** — If Twilio delivery fails or account gets suspended, the entire MVP breaks. This is the single point of failure.

💡 **Flag dependencies early to avoid last-minute surprises.** Test Twilio in dev/stage before going live.

---

## Risks

_Risk types: V=Value, U=Usability, F=Feasibility, B=Business Viability. Impact: H=High, M=Medium, L=Low_

| Risk                                                                 | Type | Impact | Mitigation                                                                                                                                        |
| -------------------------------------------------------------------- | ---- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Users reject phone-number-only auth (privacy concerns)               | V    | H      | **Validate assumption with pilot users.** If rejected, add email option in "Next" phase. For MVP, accept the risk—vision doc prioritizes access. |
| SMS delivery failures (carrier blocking, international issues)       | F    | H      | Use reputable provider (Twilio), proper opt-in language, monitor delivery rates. If <95%, investigate carrier-specific issues.                   |
| Magic link phishing / account takeover                               | B    | M      | Short token expiry (15min), single-use tokens, HTTPS only. Document risk clearly: "If someone has access to your SMS, they can access your account." |
| Persistent sessions enable account takeover if phone is stolen       | B    | M      | Accept risk for MVP—aligns with "open door" principle. Post-MVP: add "view sessions, remote logout" feature.                                     |
| SMS costs spiral with spam signups                                   | B    | M      | Rate limiting (max N SMS per phone number per hour), honeypot fields, block disposable phone numbers (Twilio lookup API).                        |
| Users lose access to phone number (can't recover account)            | U    | M      | Document clearly in UI: "Your phone number is your identity. If you lose access, you lose your account." Post-MVP: add phone number transfer flow. |
| Non-expiring sessions feel insecure to security-conscious users      | V    | L      | Explain rationale in UI: "You stay logged in until you log out—perfect for returning weeks later." If users complain, add optional session expiry. |
| Magic links don't work on some email clients (if forwarded)          | U    | L      | This is a non-issue because we're using SMS, not email. Magic links go directly to phones.                                                       |

---

## Open Questions

_For each unknown, suggest a validation approach to turn assumptions into testable hypotheses._

| Question                                                                   | Assumption                                                     | How to Validate                                                                                        | Timeline           |
| -------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------ |
| Will privacy-conscious users reject phone-number-only auth?                | Most users will accept it; small % will reject                | Test with 5-10 pilot users (mix of privacy-conscious and general population). Ask: "Would you use this?" | Before dev starts  |
| Will SMS delivery be reliable enough (95%+) across carriers?               | Twilio delivery is reliable for US/Canada                     | Send test SMS to 10+ phone numbers across carriers (AT&T, Verizon, T-Mobile) in dev/stage              | Week 1 (dev)       |
| Will users understand "magic link" flow without explicit instructions?     | Yes, most users are familiar with "click to verify" from apps | Observe 3-5 users going through RSVP flow. Do they click the SMS link without help?                   | Week 2-3 (staging) |
| Will non-expiring sessions cause security complaints from organizers?      | No complaints for low-risk MVP organizing                     | Monitor support requests and user feedback in first 30 days post-launch                                | Post-MVP launch    |
| Can we block disposable phone numbers (e.g., Burner, Google Voice) to prevent spam? | Twilio Lookup API can detect disposable numbers       | Test Twilio Lookup API in dev—check accuracy and cost per lookup                                      | Week 1 (dev)       |

---

## Before Finalizing

Before you ship this PRD, double-check:

- [x] Does `competitors.md` show competitors have this? — **No competitors.md file, but common pattern (e.g., Signal, WhatsApp use phone-based auth)**
- [x] Did you miss any recent user feedback that contradicts this approach? — **No user feedback yet (greenfield project)**

---

## Sign-off

| Role        | Name          | Approved |
| ----------- | ------------- | -------- |
| Product     | Solo Founder  | ✅       |
| Engineering | Solo Founder  | ✅       |
| Design      | Solo Founder  | ✅       |

---

## Post-MVP Evolution

**If this approach succeeds:**
- Add "view active sessions, remote logout" for security-conscious users
- Add email as alternative authentication method (if phone-only blocks adoption)
- Add phone number transfer flow (for users who change numbers)

**If this approach fails:**
- **If SMS delivery <95%:** Switch to email-based magic links, or add email as fallback
- **If users reject phone-only:** Add email authentication option
- **If account takeover becomes a problem:** Add session expiry (30 days) and re-authentication flow
