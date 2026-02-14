# PRD0005: Check-in System

**Status:** MVP
**Owner:** TBD
**Dependencies:** [@prd0003-public-moment-rsvp.md](./prd0003-public-moment-rsvp.md)

---

## Purpose

Enable participants to check in at moments and enable organizers to track actual attendance vs RSVPs.

## User

Alice (participant) - has RSVPd to a moment, is now at the event location, needs to check in.

## Check-in Options

### Option A: Location-Based (PWA, Nice-to-Have)

**Flow:**
- PWA detects participant is near event location (geofence, ~100m radius)
- Shows notification: "Welcome to [Moment Name]! Tap to check in"
- Tap notification → Check-in recorded

**Technical:**
- Requires PWA installation + location permission
- Use Geolocation API for current position
- Compare distance to moment location
- Trigger notification when within geofence

**Out of scope for MVP:**
- If complex, defer to manual check-in only

### Option B: Manual (Primary Method)

**Flow:**
- Participant opens moment link on their phone (or clicks from confirmation page)
- If event is happening now (within time window), big "Check In" button appears
- Tap "Check In" → Check-in recorded
- Success message: "You're checked in! See you here."

**Time window:**
- Button appears 1 hour before start time
- Remains available until 2 hours after start time
- Outside this window: button not shown

**Technical:**
- Check current time vs moment start time
- Show/hide check-in button based on time window
- Update turnout record on click

### Option C: Organizer Check-in (Fallback)

**Flow:**
- From organizer's single-moment dashboard (prd0006)
- Organizer sees RSVP list with participant names
- Tap name → options: "Check In", "Mark as No-Show"
- Tap "Check In" → Participant marked as checked in

**Use case:**
- Participant doesn't have phone
- Participant forgot to check in via app
- Organizer doing manual attendance at event

## Data Model Changes

**Turnout table:**
- Add field: `checked_in_at` (timestamp, nullable)
- Add field: `checked_in_by` (enum: 'self' | 'organizer' | 'location', nullable)
- Update status: Once checked in, status → "checked_in"

## Out of Scope

- No QR code check-in (too much overhead for MVP)
- No photo/selfie check-in (privacy concerns)
- No check-in incentives/gamification
- No "buddy check-in" (checking in others)

## Outputs

- Turnout status updated to "checked_in"
- Timestamp recorded (`checked_in_at`)
- Method recorded (`checked_in_by`)
- RSVP count vs check-in count visible to organizer

## Success Criteria

- 60%+ RSVP-to-check-in conversion rate
- <5 seconds from check-in button tap to confirmation
- Organizer can manually check in participants in <10 seconds per person
- Check-in data accurate (no double check-ins, no check-ins for wrong moments)

## Analytics to Track

- Check-in rate by method (manual, organizer, location if implemented)
- Time of check-in relative to moment start (early, on-time, late)
- Conversion: RSVP → check-in
