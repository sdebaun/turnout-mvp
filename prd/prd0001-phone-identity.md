# PRD0001: Phone-Based Identity System

**Status:** MVP
**Owner:** TBD
**Related:** All features (foundation for auth)

---

## Purpose

Universal authentication for all users (organizers and participants). Phone number = identity.

## How It Works

1. User provides phone number
2. System generates magic link token (random, single-use, 15-min expiry)
3. SMS sent with magic link: "Tap to continue: [link]"
4. User clicks link → authenticated session (persistent, no expiration)

## Used By

- **Organizers:** To create groups/moments, access dashboard, manage RSVPs
- **Participants:** To confirm RSVP, check in, manage their attendance

## Why Phone-Based (No Passwords)

- Universal (everyone has a phone number)
- Simple (no passwords to forget, no email verification)
- Consistent experience for organizers and participants
- Works across devices (magic link in SMS → log in anywhere)
- Low friction (one tap to authenticate)

## Data Models

- `User` table: `phone_number` (unique), `display_name`, `created_at`
- `MagicLink` table: `token`, `user_id`, `expires_at`, `used_at`
- Session: HTTP-only cookie, no expiration (persists until explicit logout)

## Security

- Magic link tokens expire after 15 minutes (short-lived)
- Magic links are single-use (can't replay)
- Session cookies: HTTPS only, HttpOnly, SameSite=Lax, Secure flag
- Rate limiting on SMS sends (prevent abuse)

## Rationale for Non-Expiring Sessions

- Usage patterns are sporadic (might organize/attend every few months)
- Phone number is the authentication mechanism (cookie isn't the weak point)
- Aligns with "open door" principle (accessibility over hardened security)
- Reduces SMS costs (no repeated re-authentication)
- Post-MVP: can add session management (view active sessions, remote logout)

## Technical Requirements

- Twilio integration for SMS delivery
- Cryptographically secure token generation
- Cookie management (secure, httponly, samesite)
- Rate limiting (prevent SMS spam)
- Token cleanup (remove expired/used tokens)

## Success Criteria

- 95%+ SMS delivery rate
- <5 second latency from form submit to SMS received
- Zero magic link replay attacks
- Session persists across browser restarts
