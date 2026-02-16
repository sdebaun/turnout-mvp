# PRD: Group & Turnout Creation Flow

**Status:** MVP (Approved for build)
**Owner:** Solo Founder
**Last Updated:** 2026-02-14
**Target Release:** MVP Week 2-3 (after phone identity)
**Availability:** All users (anyone can become an organizer)
**Rationale:** First-time organizer experience is critical to MVP validation—if people don't create turnouts, the platform has no purpose.

---

## Context

_What I found in your files:_

- **Roadmap:** Group & turnout creation is the **second MVP initiative** (1-2 week effort). Depends on phone-based identity (prd0001). Drives the outcome "Turnouts successfully created and shared" with a target of 10+ real-world turnouts.
- **Vision:** "It's hard for us to move together. Not because we don't care, but because we live in a world built to grab our attention, not channel our energy." This feature is the gateway—turning intent into action with minimal friction.
- **User story (Bob):** Bob is a first-time organizer in a small rural Oregon town (pop. 8,000). He's "never done anything remotely activist or remotely organizing before." After complaining about a gravel mine with friends for two weeks, he googles "how to organize a protest," finds turnout.network, and needs to go from zero to "turnout is live" in <2 minutes or he'll lose momentum.
- **Ubiquitous Language:** Group = ongoing organizing entity (e.g., "Save Willow Creek"). Turnout = organizing effort within an area of operations (e.g., "First Planning Meeting"). Opportunity = specific way to participate. Engagement = participant's interaction with an opportunity.
- **Strategic fit:** Solo founder, validation focus. Need to prove that "10+ real turnouts get created" to validate the concept. This is the make-or-break feature.

---

## Problem

**What problem are we solving?**

First-time organizers face overwhelming friction when trying to organize collective action:

1. **Analysis paralysis:** "What do I even call this? Do I need a logo? A website? A nonprofit?"
2. **Tool complexity:** Existing platforms (Eventbrite, Mobilize, Action Network) assume you're an experienced organizer with budget and staff
3. **Cognitive load:** "Create account, verify email, set up organization, configure settings, create event..." by step 3, you've given up
4. **Loss of momentum:** The gap between "I should do something" and "there's a shareable link people can RSVP to" is where organizing dies

**Who experiences this problem?**

- **Bob (first-time organizer):** Never organized before, no budget, no team, just pissed off about a local issue and wants to DO something instead of just complaining
- **Casual organizers:** People who want to create one-off turnouts (community cleanups, mutual aid distributions, protest marches) without becoming "professional activists"
- **Small-town organizers:** No existing activist infrastructure, no mentors, just trying to coordinate with friends

**In what situation?**

- Bob is sitting on his couch on Thursday night after two weeks of complaining in a group chat with friends about the gravel mine
- He's had a couple beers, he's frustrated, and he googles "how to organize a protest"
- He finds turnout.network and clicks "Start Organizing"
- **Critical moment:** If the next screen overwhelms him or asks for too much upfront, he closes the tab and goes to bed
- If it's dead simple—"What are you organizing for? Save Willow Creek. When? Next Friday at 6pm. Great, here's your link"—he shares it with his friends immediately

---

## Evidence

✅ **Validated:**

- **User story explicitly shows the problem:** Bob user story (user-stories.md, lines 15-35) shows "he's never done anything remotely activist or remotely organizing before" and "googles how to organize a protest." He needs instant gratification, not a multi-step setup wizard.
- **Roadmap confirms this is critical:** "Turnouts successfully created" is the first product outcome. If organizers don't create turnouts, nothing else matters.
- **Vision confirms the barrier:** "People get overwhelmed by feeds, distracted by group chats, or lost in apps that reward scrolling more than showing up." We're solving for attention span and momentum.
- **Architecture confirms constraints:** Solo founder, free tier, validation focus. Can't afford complex onboarding—need to ship fast and learn.
- **Alice's user story requires geocoding:** Alice (user-stories.md, line 34) clicks "Give me Directions" in her reminder and "it pulls up google maps on her phone." This requires lat/long coordinates. Google Places Autocomplete provides this data when Bob selects a location (no server-side geocoding needed).
- **Places Autocomplete is the modern standard:** Users expect location inputs to autocomplete (like Google Maps, Uber, Airbnb, etc.). Typing "Foster Library" and getting a dropdown with the full address is familiar UX in 2026. Plain text input would feel outdated and error-prone.

⚠️ **Assumed:**

- Single-page form is better than multi-step wizard → **Risk:** Users might prefer "one question at a time" flow (needs testing)
- Psychological ordering (vision → action → identity) reduces cognitive load → **Risk:** This is UX psychology theory, not validated with real users yet
- Pre-filling fields (random name, "First Planning Meeting") reduces friction → **Risk:** Users might find it presumptuous or confusing
- Phone verification AFTER form submission is acceptable → **Risk:** Users might abandon if they have to wait for SMS after investing time in form

---

## Success Criteria

### Lagging Indicators (post-launch outcomes)

| Metric                                     | Current | Target | Timeframe    |
| ------------------------------------------ | ------- | ------ | ------------ |
| Form completion rate (start → submit)      | N/A     | ≥90%   | MVP launch   |
| Time from landing → "turnout is live"       | N/A     | <2 min | MVP launch   |
| Magic link click rate (submit → click SMS) | N/A     | ≥95%   | MVP launch   |
| Real turnouts created (with ≥1 RSVP)        | 0       | ≥10    | MVP lifetime |

### Leading Indicators (pre-launch signals)

| Metric                                        | Current | Target | What This Predicts                            |
| --------------------------------------------- | ------- | ------ | --------------------------------------------- |
| Internal dogfooding: create turnout in <2 min  | N/A     | 100%   | Real users will complete flow quickly         |
| User testing: complete form without help      | N/A     | ≥80%   | Form fields are self-explanatory              |
| User testing: understand shareable link       | N/A     | 100%   | Organizers will know how to share their turnout|
| Form validation errors per submission attempt | N/A     | <0.5   | Form is forgiving, not pedantic               |

💡 **Leading indicators help you course-correct before launch.** If user testing shows <80% completion without help, simplify the form before building the full flow.

---

## Proposed Solution

### How It Works

**Single creation flow** that produces both a group (ongoing organizing entity) and a turnout (first event) atomically, with phone verification preventing spam before database writes.

**What data is required:**

_Group data:_
- Mission/purpose statement (free text describing what the group is organizing for)
- Group name (can be auto-suggested from mission statement)

_Turnout data:_
- Title (can be pre-filled with sensible default like "First Planning Meeting")
- Description (optional)
- Location (address or landmark, with geocoding to enable directions)
- Date and time (must be future)

_Organizer data (from prd0001):_
- Phone number (for OTP code verification)
- Display name (can be randomly generated pseudonym)

**What outputs are provided:**

- Group record (with organizer as creator)
- Turnout record (linked to group, with default "Show Up" opportunity)
- Authenticated session for organizer
- Shareable turnout URL (public, short format)
- Calendar integration data (.ics file capability)

**Key constraints:**

- **No authentication required upfront:** User can fill form without login
- **Phone verification before database writes:** Prevents spam turnout creation
- **Psychological ordering principle:** Collect data in order that minimizes abandonment (vision/purpose → logistics/action → identity/commitment). Ask for phone number last, after user has invested cognitive effort.
- **Geocoding required:** Location must resolve to coordinates for directions and potential check-in features
- **Google Places Autocomplete required:** Modern UX expectation, provides immediate lat/long data
- **Atomic creation:** Group and turnout created together in single transaction (both succeed or both fail)
- **<2 minute target:** From landing page to shareable link must take under 2 minutes

**User experience flow:**

Unauthenticated user lands on creation page → Fills form collecting group mission, turnout details, organizer identity → Submits form → Receives SMS with OTP code → Enters code (or taps autofill on mobile) → Group and turnout atomically created in database → Organizer authenticated → Redirected to dashboard showing shareable link and RSVP count

**Key decisions:**

- **Single-page form, not multi-step wizard:** Reduces cognitive load (user sees entire commitment upfront), faster completion
- **Psychological ordering (vision → action → identity):** Reduces abandonment by asking for personal info (phone) last
- **Pre-filled suggestions:** Reduce friction (user can accept defaults without thinking)
- **Phone verification AFTER form submission:** Prevents spam without adding upfront friction
- **Group + turnout created atomically:** Simplifies mental model for first-time organizers

### User Stories (Examples)

**Story 1: Bob creates his first turnout in <2 minutes**

- **As a** first-time organizer who's never used organizing tools before
- **I want to** go from "I should do something" to "here's a shareable link" in under 2 minutes
- **So that** I don't lose momentum or get overwhelmed by complexity

**Story 2: Bob shares his turnout immediately after creation**

- **As an** organizer who just created a turnout
- **I want to** see a shareable link with copy/share buttons immediately
- **So that** I can share it with my group chat while I'm still excited about it

**Story 3: Bob uses a pseudonym to protect his privacy**

- **As an** organizer in a small town where everyone knows everyone
- **I want to** organize under a pseudonym (not my real name)
- **So that** I can test the waters without outing myself publicly until I'm ready

---

## Non-Goals

What we're explicitly **NOT** doing in MVP:

- **No group branding** — No logos, colors, custom domains, "about" pages. Just group name and mission. Deferred to "Next" phase.
- **No public group pages** — Groups are internal (for organizers to manage turnouts). Turnouts are public (for participants to RSVP). No "Save Willow Creek landing page" in MVP.
- **No multiple opportunities per turnout** — Every turnout just has one way to participate: "Show Up." Multiple roles (street medic, legal observer, safety coordinator) deferred to "Later."
- **No turnout templates** — No "Create a protest" vs "Create a cleanup" with pre-filled fields. Just freeform text. Templates deferred to "Next" if organizers ask for them.
- **No group-level settings** — No privacy controls, no group descriptions beyond mission statement, no group member management. Collaboration (adding co-organizers) is prd0007.
- **No recurring turnouts** — No "every Tuesday at 6pm" option. Each turnout is one-time. Recurrence deferred to "Later."
- **No draft mode** — Once Bob enters the verification code, the turnout is live. No "save as draft, publish later" option.

---

## Future Considerations

_These features are not in scope for MVP, but are likely enough in the near term that they should influence your architectural decisions today. Don't over-engineer for them, but don't paint yourself into a corner either._

| Future Capability | Likelihood | Design Hint |
| ----------------- | ---------- | ----------- |
| **Multiple opportunities per turnout** (street medic, legal observer, etc.) | High (Later phase) | Don't hardcode "Show Up" as the only option. Model turnouts with a **many-to-many relationship to opportunities** (via join table) even though MVP creates a single default opportunity. When you create a turnout, also create a default `Opportunity` record (name: "Show Up", unlimited slots). This costs almost nothing now but prevents a painful schema migration later. |
| **Group branding** (logos, colors, public pages) | High (Next phase) | Add nullable `logo_url`, `primary_color`, `secondary_color`, `about` fields to the `groups` table now, even if MVP doesn't use them. Frontend doesn't need to render them, but having the schema ready means "Next" phase is just UI work, not a migration. |
| **Turnout templates** ("Create a protest" vs "Create a cleanup") | Medium (Next phase) | Store turnout creation flow as **data, not code**. Example: `turnout_templates` table with `name`, `description_prompt`, `default_title`, `suggested_fields`. MVP just has one template ("Blank"), but the system is designed to support many. Don't hardcode form fields in React components. |
| **Recurring turnouts** ("every Tuesday at 6pm") | Medium (Later phase) | Add optional `recurrence_rule` (nullable JSON or cron-like string) to `turnouts` table now. MVP leaves it null. When recurrence comes, you'll generate turnout instances from the rule. Don't assume one turnout = one event forever. |

💡 **The pattern:** Model the **data schema** for future extensions now (costs ~zero), but don't build the **UI/logic** until needed. This prevents painful migrations later.

---

## Dependencies

### Feature Dependencies

- **Phone-based identity (prd0001):** REQUIRED. Magic link flow depends on this being implemented first. Can't build this until prd0001 is done.

### Team Dependencies

- **Solo founder** — No external team dependencies

### External Dependencies

- **Twilio SMS API (via prd0001):** Required for OTP code delivery. If SMS delivery fails, organizers can't create turnouts.
- **Google Maps JavaScript API + Places API:** REQUIRED for MVP. Provides autocomplete widget for location input—Bob starts typing "Foster Library" and gets dropdown suggestions with full addresses. When Bob selects a place, we get `place_id`, `lat/long`, `formatted_address` immediately (no server-side geocoding needed). **Why required:** Alice's user story (user-stories.md line 34) shows "Give me Directions" button in reminders—can't provide maps links without location coordinates. Also needed for calendar invites (prd0003) and potentially check-in geofencing (prd0005). Cost: Places Autocomplete is ~$2.83 per 1,000 requests (well within budget for 10 turnouts in MVP). **Risk if delayed:** Participants can't get directions, breaks Alice's flow.

**Critical Path:** **Twilio SMS** (inherited from prd0001) AND **Google Maps Places API**. If OTP codes don't deliver, organizers can't create turnouts. If Places API is unavailable, Bob can't enter location (blocks turnout creation—need fallback to plain text input).

💡 **Flag dependencies early to avoid last-minute surprises.** Test the full create-moment flow (form → SMS → click → dashboard) in staging before going live.

---

## Risks

_Risk types: V=Value, U=Usability, F=Feasibility, B=Business Viability. Impact: H=High, M=Medium, L=Low_

| Risk                                                                 | Type | Impact | Mitigation                                                                                                                                        |
| -------------------------------------------------------------------- | ---- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| No one creates turnouts (organizers don't adopt)                     | V    | H      | **This kills the MVP.** Pre-recruit 3-5 pilot organizers before launch. Offer to walk them through creating their first turnout. If they won't use it, pivot or kill. |
| Single-page form is overwhelming (users abandon mid-form)            | U    | H      | **User test with 5 people before launch.** Watch them fill out the form. If >20% abandon, break into multi-step wizard. Track analytics: measure drop-off at each field. |
| Psychological ordering doesn't work (users confused by flow)         | U    | M      | User test: can users complete form without instructions? If confused, reorder fields (logistics first, identity last might be more familiar). |
| Phone verification step loses users (abandon after form submit)      | U    | M      | Track OTP code entry rate (target ≥95%). If <90%, add messaging: "Check your phone for a text from Turnout!" with visual SMS icon. Consider WebOTP autofill to reduce friction. |
| Pre-filled fields (random name, "First Planning Meeting") feel patronizing | U | M | User test: do users edit pre-filled fields or just accept them? If >50% edit, maybe remove pre-fills. If <20% edit, they're working as intended. |
| Form validation is too strict (rejects valid input)                  | U    | M      | Be forgiving: accept any text for location (even if geocoding fails—see risk above), accept future dates only (but don't enforce "must be >24 hours from now"). Monitor support requests for validation complaints. |
| Spam / abuse (bots creating fake turnouts)                            | B    | M      | Phone verification (prd0001) is first line of defense. Add honeypot fields (hidden inputs that bots fill but humans don't). Rate limiting: max N turnouts per phone number per day. |
| Google Places API fails to load / Bob bypasses autocomplete          | U    | M      | **Fallback:** If Places API fails to load (network issue, script blocked), fall back to plain text input. Show notice: "Enter a full address or landmark." Accept Bob's text as-is, but don't populate lat/long fields (participants won't get "Get Directions" button). Validate that Bob entered something (required field). Post-MVP: add server-side geocoding as fallback for plain text entries. |
| Bob selects wrong place from autocomplete (ambiguous names)          | U    | L      | Places Autocomplete shows formatted addresses in dropdown ("Foster Library - 651 E Main St, Ventura, CA"). Bob can see which one is correct. If Bob picks wrong one, he can edit location in dashboard later (post-MVP feature). For MVP, accept that Bob might make mistakes. |
| Google Maps API costs spiral with spam autocomplete requests         | B    | L      | Rate limiting prevents this (max N turnouts per phone per day). Autocomplete charges per session (~$2.83 per 1,000 sessions). Would need 1,000 spam turnout creations to cost $2.83. Phone verification already blocks most spam. |
| Group name collisions ("Save Willow Creek" already exists)           | U    | L      | For MVP, allow duplicate group names—they have different UUIDs internally. Post-MVP: add search ("does this group already exist?") before creation. |
| Turnout URL slug collisions (two turnouts get same short ID)           | F    | L      | Use cryptographically random short IDs (6-8 chars, base62 encoding). Collision probability is negligible. If collision occurs, regenerate. |

---

## Open Questions

_For each unknown, suggest a validation approach to turn assumptions into testable hypotheses._

| Question                                                              | Assumption                                              | How to Validate                                                                                  | Timeline           |
| --------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------ |
| Is single-page form better than multi-step wizard?                    | Single-page reduces cognitive load, faster completion  | Build both (low-fi prototypes). Test with 5 users each. Measure completion time and abandonment. | Before dev starts  |
| Does psychological ordering (vision → action → identity) reduce abandonment? | Yes, asking for phone number last reduces friction | A/B test: 50% see vision-first, 50% see phone-first. Measure completion rate.                   | Week 3-4 (staging) |
| Will organizers understand "group vs turnout" distinction?              | Yes, it's intuitive ("Save Willow Creek" = ongoing, "First Planning Meeting" = specific event) | User test: ask users to explain back what they just created. If confused, simplify language or merge concepts. | Week 2-3 (staging) |
| Do pre-filled fields (random name, "First Planning Meeting") reduce friction or add confusion? | They reduce friction (users just accept defaults) | Track edit rate: what % of users edit pre-filled fields? If <20%, they're helpful. If >50%, remove them. | Post-launch (analytics) |
| Will organizers share their turnout immediately after creation?        | Yes, they'll copy/paste link into group chat right away| Track time from "turnout created" to "first RSVP." If median is <1 hour, sharing is working. If >24 hours, improve share UX. | Post-launch (analytics) |

---



