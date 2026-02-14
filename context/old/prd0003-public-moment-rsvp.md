# PRD0003: Public Moment Pages + RSVP

**Status:** MVP
**Owner:** TBD
**Dependencies:** [@prd0001-phone-identity.md](./prd0001-phone-identity.md), [@prd0002-group-moment-creation.md](./prd0002-group-moment-creation.md)

---

## Purpose

Enable participants to discover moments via shareable links and RSVP with minimal friction.

## User

Alice (first-time participant) - receives a link to a moment from a friend, wants to RSVP.

## User Flow

1. Click link → See public moment page
   - What: [moment description]
   - Where: [location + embedded map]
   - When: [date, time, relative time "in 3 days"]
   - Who's organizing: [organizer display name]
   - Who else is coming: [participant count, optionally names if public]
2. Click "RSVP" button
3. Modal appears:
   - Phone number (required, uses phone-based identity system)
   - Your name (random pseudonym pre-filled, editable)
   - Checkbox: "Make my participation public" (default: off)
4. Submit → "Check your messages" screen
5. SMS sent via phone-based identity system:
   ```
   Turnout: Click to confirm your RSVP for [moment name]: [magic link]
   ```
6. Click link → RSVP confirmed, participant record + turnout created NOW
7. Confirmation page (authenticated session created):
   - "You're signed up for [moment name]!"
   - "Add to calendar" button (downloads .ics file)
   - "Add to homescreen" prompt (PWA install)
   - Link back to moment page (now shows updated RSVP count)

## Public Moment Page Requirements

**URL format:** `turnout.network/m/[short-id]`
- short-id: 8-character alphanumeric (e.g., `abc12345`)
- Must be unique, URL-safe
- Generated on moment creation

**Page content:**
- Moment name (h1)
- Moment description (if provided)
- Date/time with relative time display ("in 3 days", "tomorrow at 6pm")
- Location with embedded map (Google Maps or similar)
- Organizer display name
- RSVP count
- If participant count >0 and any are public: show public participant names
- Prominent "RSVP" CTA button

**SEO/Social sharing:**
- OpenGraph meta tags (title, description, image)
- Twitter card
- Server-side rendered (for link previews in messaging apps)

## RSVP Modal Requirements

**Phone number field:**
- Type: Tel input
- Validation: Valid phone format, required
- Uses prd0001 phone identity system

**Participant name field:**
- Type: Text input
- Pre-filled: Random pseudonym (e.g., "BlueWombat")
- User can reroll or edit
- Validation: Required, 1-50 characters

**Make participation public checkbox:**
- Type: Checkbox
- Default: unchecked (private by default)
- Label: "Show my name on the moment page"
- If checked: participant name appears in public participant list

## Out of Scope

- No multiple opportunities (everyone RSVPs to "Show Up")
- No participant accounts (phone number is identity)
- No post-RSVP profile creation (deferred to post-MVP)
- No detailed social proof (just count, not "X friends are going")
- No capacity limits (unlimited RSVPs for MVP)

## Implementation Notes

- RSVP data (phone, name, public preference) encoded in magic link token
- Token has 15-min expiry (same as prd0001)
- Prevents spam RSVPs (no DB writes until phone verified)
- Calendar .ics file generated server-side on confirmation

## Outputs (After Magic Link Click)

- Participant record created (if new phone number) or retrieved (if returning)
- Turnout record created (status: "confirmed")
- Calendar .ics file generated and available for download
- Alice authenticated (session cookie)
- Moment page RSVP count incremented

## Success Criteria

- 80%+ RSVP completion rate (users who click RSVP complete it)
- 95%+ magic link click rate (users who submit RSVP click SMS)
- <1 min from RSVP submit to confirmation page
- Calendar file downloads successfully in all major calendar apps
- Public moment pages render in <2 seconds
