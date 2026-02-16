# PRD0004: SMS Reminder System

**Status:** MVP
**Owner:** TBD
**Dependencies:** [@prd0001-phone-identity.md](./prd0001-phone-identity.md), [@prd0003-public-moment-rsvp.md](./prd0003-public-moment-rsvp.md)

---

## Purpose

Send timely reminders to participants to maximize show-up rates. Use hybrid approach: PWA notifications (free) with SMS fallback (reliable).

## User

Alice (participant) - has RSVPd to a moment, needs reminders so she actually shows up.

## SMS Reminder Flow

**Confirmation (immediate, after RSVP):**
```
Turnout: Click to confirm your RSVP for [Moment Name] on [Date]:
[magic link]
```

**Reminder (evening before event, if event is next day):**
```
Turnout: Reminder - [Moment Name] tomorrow at [Time] at [Location]. Still coming?
Reply YES or NO
```

**Day-of reminder (1 hour before):**
```
Turnout: [Moment Name] starts in 1 hour at [Location]!
Tap for directions: [maps link]
```

**Running late (at event start time, if not checked in):**
```
Turnout: [Moment Name] is happening now. On your way?
Reply LATE if you're coming, or CANCEL if you can't make it
```

## Hybrid Notification Strategy

**For each reminder:**
1. Check if participant has PWA installed + notifications granted
2. If yes: Send PWA notification (free)
3. If no: Send SMS (reliable)
4. Track which method was used (for analytics)

**Goal:** Reduce SMS costs while ensuring 100% reminder delivery.

## SMS Reply Handling

**Supported keywords (case-insensitive):**
- `YES` → Update turnout status to "confirmed" (no-op, already confirmed)
- `NO` → Update turnout status to "canceled"
- `LATE` → Update turnout status to "late"
- `CANCEL` → Update turnout status to "canceled"

**Implementation:**
- Twilio webhook receives SMS replies
- Parse message body for keywords
- Update turnout record
- (Optional) Send confirmation SMS: "Got it, marked you as [status]"

## Scheduling Requirements

**Cron job or serverless function:**
- Runs every 15 minutes
- Queries for moments with upcoming reminder times
- Sends appropriate reminders

**Reminder timing:**
- **Night before:** 7pm local time, if moment is tomorrow
- **1 hour before:** Exactly 60 minutes before moment start time
- **At start time:** If participant hasn't checked in

**Timezone handling:**
- Moments stored in UTC
- Reminders sent in moment's local timezone
- Participant's timezone not considered (moment location is what matters)

## Out of Scope

- No customizable reminder timing (fixed schedule above)
- No reminder preferences (everyone gets all reminders)
- No complex SMS reply parsing (only YES/NO/LATE/CANCEL)
- No conversation/help text (just process keywords)
- No opt-out mechanism (if you RSVP, you get reminders)

## Technical Requirements

- Twilio integration for sending SMS and receiving replies
- Cron/scheduled function infrastructure
- PWA web push API integration
- Database fields: `turnout.notification_method` (enum: 'sms' | 'pwa')
- Track which method used for each reminder sent

## Success Criteria

- 100% reminder delivery (via PWA or SMS)
- 20-40% PWA notification adoption (reduces SMS costs)
- <5 min latency between scheduled time and actual send
- 95%+ SMS delivery rate (Twilio)
- Reply keywords processed within 30 seconds
- Measure: does receiving reminders increase check-in rate? (baseline vs reminded)

## Analytics to Track

- % reminders sent via PWA vs SMS
- Reply rates to each reminder type
- Check-in rate: reminded vs not reminded (if we A/B test)
- Cost per participant (SMS costs)
