# PRD: SMS Reminder System

**Status:** MVP (Approved for build)
**Owner:** Solo Founder
**Last Updated:** 2026-02-14
**Target Release:** MVP Week 6 (after RSVP flow)
**Availability:** All participants (anyone who RSVPs to a turnout)
**Rationale:** Reminders are universal—every participant needs them to bridge the gap between commitment and follow-through.

---

## Context

_What I found in your files:_

- **Roadmap:** SMS reminder system is the **4th MVP initiative** (1 week effort). Depends on RSVP flow (prd0003) and phone identity (prd0001). Drives the outcome "Participants respond to reminders" with target ≥40% interaction rate. Critical for validating "60% RSVP-to-check-in conversion"—if people RSVP but don't show up, the network doesn't work.
- **Vision:** "It's hard for us to move together... because we live in a world built to grab our attention, not channel our energy." Reminders channel attention toward commitments people already made.
- **User story (Alice):** Alice's user story (user-stories.md, lines 25-31) shows detailed reminder flow: **Night before** (evening, "Don't forget... Still going?"), **1 hour before** ("happening in an hour!"), **At start time** ("I'm on the way" option). All with interactive responses.
- **Architecture:** Technical stack already decided: **Hybrid PWA/SMS strategy** (prefer free PWA notifications, fallback to paid SMS ~$0.0079 each). AWS EventBridge for scheduling (every 15 min for upcoming reminders). Web Push API (standards-based).
- **Strategic fit:** Solo founder, free-tier constraints. Reminders are the mechanism to prove "people who RSVP actually show up"—core validation metric.

---

## Problem

**What problem are we solving?**

People commit to showing up (RSVP) but fail to follow through because they forget, lose track of time, or lose momentum:

1. **"I forgot":** The turnout was 3 days away when you RSVP'd. By the time it arrives, it's buried under life's distractions.
2. **"I wasn't sure if it was still happening":** No confirmation the day before → uncertainty → decide not to go
3. **"I didn't know how to get there":** Location was on the RSVP page, but finding it again at 9:55am is friction
4. **"I would have gone but I forgot until it was too late":** Remembered at 10:30am that it started at 10am
5. **"I changed my mind but didn't tell anyone":** Life happened, can't make it anymore, but no easy way to cancel

**Who experiences this problem?**

- **Alice (first-time participant):** RSVP'd Monday for Saturday 10am protest. By Friday night, she's not thinking about it. By Saturday morning, she's sleeping in. Without reminders, she never shows up.
- **Casual participants:** RSVP in a moment of enthusiasm but don't have strong organizing habits. Need external prompts to follow through.
- **Busy participants:** Want to show up but juggling work, family, life. Reminders make the difference.

**In what situation?**

- Alice RSVP'd Tuesday. It's Saturday 10am.
- **Without reminders:** Wakes up at 11am, remembers it was at 10am, feels guilty, doesn't go.
- **With reminders:** Friday night: "Still going?" → confirms. Saturday 9am: "1 hour away!" → sets alarm. Saturday 10am running late: taps "I'm on the way" → organizer knows she's coming.

---

## Evidence

✅ **Validated:**

- **User story explicitly shows reminder flow:** Alice's user story (lines 25-31) shows three reminder times: night before, 1 hour before, at start time. All with interactive responses. This flow is specified.
- **Roadmap confirms criticality:** "Participants respond to reminders" is a leading indicator (target ≥40%). "RSVPs convert to check-ins" is a lagging indicator (target ≥60%). Reminders connect these.
- **Business objective requires this:** "Demonstrate that reminders drive follow-through" (ROADMAP.md line 53) with "measurable difference in show-up rate with vs without reminders."
- **Architecture confirms hybrid strategy:** "Prefer PWA notifications (free), fallback to SMS when PWA unavailable" (ARCHITECTURE.md). Already decided.
- **Scheduling infrastructure exists:** AWS EventBridge with specific cron schedules already defined: every 15 min for 24h/1h reminders, every 5 min for "starting now."

⚠️ **Assumed:**

- Participants will allow PWA notifications → **Risk:** If permission rate is <50%, SMS costs could spiral
- Interactive reminder responses increase engagement → **Risk:** Users might find them annoying instead of helpful
- Reminder timing (night before, 1h before, start) is optimal → **Risk:** Different turnout types might need different timing
- SMS fallback is acceptable cost (~$0.0079 per reminder) → **Risk:** With 50 participants × 3 reminders = $1.18 per turnout if everyone needs SMS

---

## Success Criteria

### Lagging Indicators (post-launch outcomes)

| Metric                                  | Current | Target | Timeframe    |
| --------------------------------------- | ------- | ------ | ------------ |
| Reminder interaction rate (any response) | N/A     | ≥40%   | MVP launch   |
| RSVP-to-check-in conversion (with reminders) | N/A | ≥60%   | MVP launch   |
| PWA notification permission grant rate   | N/A     | ≥50%   | MVP launch   |
| SMS fallback rate (% reminders via SMS) | N/A     | ≤50%   | MVP launch   |
| Reminder delivery success rate          | N/A     | ≥95%   | MVP launch   |

### Leading Indicators (pre-launch signals)

| Metric                                        | Current | Target | What This Predicts                            |
| --------------------------------------------- | ------- | ------ | --------------------------------------------- |
| PWA notification delivery success in testing   | N/A     | ≥95%   | Production notifications will reach users      |
| Scheduled job execution reliability            | N/A     | 100%   | Reminders won't be missed due to infra issues  |
| SMS delivery rate (fallback, via prd0001)      | N/A     | ≥95%   | SMS fallback works when PWA unavailable        |
| User testing: understand reminder actions      | N/A     | ≥80%   | Interactive responses are intuitive            |

💡 **Leading indicators help you course-correct before launch.** If PWA permission rate is <50% in testing, expect high SMS costs and adjust strategy.

---

## Proposed Solution

### How It Works

**Hybrid notification system** that sends timely reminders via PWA notifications (preferred, free) or SMS (fallback, paid), with interactive response capabilities.

**What data is required:**

- Engagement record (participant's RSVP to turnout)
- Turnout date/time (to calculate reminder timing)
- Participant's notification preferences (PWA subscription or SMS-only flag)
- Participant's timezone (for correct local time delivery)

**What outputs are provided:**

- Scheduled reminders at strategic times (night before, 1 hour before, at start time)
- Interactive response handling (confirm, cancel, directions, late)
- Updated engagement status based on participant responses
- Delivery tracking (which method used, success/failure, response received)

**Key constraints:**

- **Hybrid delivery required:** Try PWA first (free), fall back to SMS (paid) only when necessary
- **Timezone-aware scheduling:** Reminders fire at correct local time for participant
- **Idempotency required:** Scheduled jobs run every 15 min—must not send duplicate reminders
- **Interactive responses required:** Participants can respond directly from notification
- **Cost optimization required:** Minimize SMS usage to stay under budget

**Reminder timing:**

1. **Night before (evening):** ~18 hours before turnout start → confirmation/reconfirmation
2. **1 hour before:** Exactly 1 hour before turnout start → activation reminder
3. **At start time:** When turnout begins → late arrival option

**Response options (from old PRD + user story):**

- Confirmation responses: YES (confirm), NO (cancel)
- Late/status responses: LATE (running late), CANCEL (can't make it)
- Utility responses: Directions link in notification

**User experience flow:**

Participant RSVPs → System requests PWA notification permission → If granted, PWA subscription stored; if denied, SMS fallback flag set → Scheduled jobs check for upcoming turnouts → At reminder time, send via PWA or SMS → Participant responds → Engagement status updated → Organizer sees updated RSVP list

**Key decisions:**

- **Hybrid PWA/SMS strategy:** Minimize costs by preferring free PWA, only use SMS when necessary. Track effectiveness of each method.
- **Three reminder times:** Night before (confirmation), 1h before (activation), at start (late arrivals). Based on Alice's user story.
- **SMS keyword responses:** Support simple keywords (YES, NO, LATE, CANCEL) for SMS replies. No natural language processing in MVP.
- **Timezone-aware:** Turnout time stored in UTC, reminders fire based on participant's local timezone.
- **Idempotent delivery:** Track which reminders sent to prevent duplicates when cron jobs run every 15 min.

### User Stories (Examples)

**Story 1: Alice gets reminders and shows up**

- **As a** participant who RSVP'd several days ago
- **I want to** receive timely reminders (night before, 1 hour before) so I don't forget
- **So that** I actually show up instead of forgetting or losing track of time

**Story 2: Alice cancels via SMS reply**

- **As a** participant who can no longer attend
- **I want to** cancel by replying "NO" or "CANCEL" to the reminder SMS
- **So that** the organizer knows I'm not coming and I don't feel guilty

**Story 3: Alice is running late**

- **As a** participant running late
- **I want to** reply "LATE" or tap "I'm on the way" at start time
- **So that** the organizer knows I'm still coming, just delayed

**Story 4: Alice gets PWA notifications (no SMS cost)**

- **As a** participant who granted PWA notification permissions
- **I want to** receive free PWA notifications instead of SMS
- **So that** the platform can keep costs low while still reminding me

**Story 5: Alice gets directions from the reminder**

- **As a** participant who got a 1-hour reminder
- **I want to** tap "Get Directions" and have it open maps to the turnout location
- **So that** I can navigate there without having to hunt for the address again

---

## Non-Goals

What we're explicitly **NOT** doing in MVP:

- **No custom reminder timing per participant:** MVP uses fixed times (night before, 1h before, start). No "remind me 30 min before" customization. Defer to "Next."
- **No reminder preferences/opt-out:** Everyone who RSVPs gets all reminders. No "don't remind me" toggle. Defer to "Next."
- **No complex SMS reply parsing:** MVP supports simple keywords (YES, NO, LATE, CANCEL) only. No natural language ("I'll be 10 minutes late"). Defer to "Later."
- **No confirmation SMS for replies:** When participant replies "YES", no confirmation SMS sent back ("Got it, marked you as confirmed"). Just process silently. Defer if users complain.
- **No digest/summary reminders:** No "You have 3 turnouts this week" digests. Just individual turnout reminders. Defer to "Later."
- **No organizer-customizable reminder messages:** Organizers can't write custom reminder copy. MVP uses standard templates. Defer to "Later."
- **No A/B testing reminder timing:** Fixed timing based on user story. No experimentation with different timing windows. Defer to post-MVP analytics phase.

---

## Dependencies

### Feature Dependencies

- **Phone-based identity (prd0001):** REQUIRED. Need phone numbers for SMS fallback. Can't send SMS without phone verification system.
- **Public turnout pages + RSVP (prd0003):** REQUIRED. Can't send reminders if nobody RSVP'd. Need engagements table with participant-turnout linkage.
- **PWA setup (part of prd0003):** REQUIRED. Alice's user story shows PWA notification permission request after RSVP. Need PWA installable and notification API integration.

### Team Dependencies

- **Solo founder** — No external team dependencies

### External Dependencies

- **Twilio SMS API (via prd0001):** Required for SMS fallback. If SMS delivery fails, non-PWA participants won't get reminders. **Risk:** Reminder system breaks for ~50% of participants if permission rate is low.
- **Web Push API (browser standard):** Required for PWA notifications. Supported in Chrome, Firefox, Edge, Safari (iOS 16.4+). **Risk:** Fall back to SMS for all (costs spiral). **Mitigation:** Progressive enhancement.
- **AWS EventBridge (via SST):** Required for scheduled reminder delivery. Cron jobs run every 15 min. **Risk:** If jobs don't execute, reminders missed. **Mitigation:** SST provides EventBridge out-of-box.

**Critical Path:** **AWS EventBridge scheduling reliability** — If cron jobs don't execute reliably, reminders are missed and RSVP-to-check-in conversion tanks. Twilio SMS and Web Push API are fallbacks for each other.

💡 **Flag dependencies early.** Test EventBridge cron reliability in staging before going live.

---

## Risks

_Risk types: V=Value, U=Usability, F=Feasibility, B=Business Viability. Impact: H=High, M=Medium, L=Low_

| Risk                                                                 | Type | Impact | Mitigation                                                                                                                                        |
| -------------------------------------------------------------------- | ---- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Low PWA permission rate (<50%) → high SMS costs                      | B    | H      | Track permission grant rate in analytics. If <50%, optimize permission request UX. Monitor SMS costs daily—budget alerts at $20/day. |
| Participants find reminders annoying (ignore/opt-out requests)       | V    | H      | Track interaction rate (target ≥40%). If <20%, reminders aren't adding value. A/B test passive vs interactive reminders. |
| Scheduled jobs fail to execute (EventBridge/Lambda issues)           | F    | H      | Test EventBridge reliability in staging. CloudWatch alarms for job failures. Retry logic with exponential backoff. |
| Reminder timing wrong for some turnout types                         | U    | M      | Accept for MVP—fixed timing from user story. Track complaints. If >10% complain, add customization in "Next." |
| SMS costs spiral with spam turnouts                                  | B    | M      | Phone verification blocks most spam. Rate limiting on turnout creation. Budget alerts. |
| Participants don't understand SMS keywords                           | U    | M      | User test: send test SMS to 5 people. Do they reply with keywords? Track invalid replies. |
| Timezone bugs (reminder fires at wrong time)                         | F    | M      | Store UTC, convert to local. Test with different timezones. Fall back to organizer's timezone if bugs. |
| Web Push API not supported in participant's browser                  | F    | L      | Progressive enhancement: detect support, fall back to SMS. Track browser distribution. |

---

## Open Questions

_For each unknown, suggest a validation approach to turn assumptions into testable hypotheses._

| Question                                                              | Assumption                                              | How to Validate                                                                                  | Timeline           |
| --------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------ |
| Will participants grant PWA notification permissions (target ≥50%)?    | Yes, if we explain value clearly                        | Track permission grant rate in staging. Test different copy: "Get free reminders" vs "Stay updated". Measure difference. | Week 6-7 (staging) |
| Is reminder timing optimal (night before, 1h before, start)?          | Yes, based on Alice's user story                        | A/B test: Group A gets 3 reminders, Group B gets 2 (1h/start only). Measure RSVP-to-check-in conversion. | Post-launch |
| Will interactive responses increase engagement vs passive reminders?   | Yes, "Still going?" gets more responses                 | A/B test: 50% interactive, 50% passive. Measure interaction rate. | Week 7-8 (staging) |
| What % of reminders will require SMS fallback (target ≤50%)?          | Most will use PWA (free)                                | Track PWA subscription rate and SMS usage. If SMS >50%, improve PWA UX or budget higher costs. | Post-launch |
| Will participants understand SMS keywords (YES/NO/LATE/CANCEL)?       | Yes, familiar pattern                                   | User test: send test SMS to 5 people. Track invalid replies ("I'll be there!" vs "YES"). | Week 6-7 (staging) |

---
