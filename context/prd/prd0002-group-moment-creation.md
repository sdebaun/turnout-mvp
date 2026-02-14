# PRD: Group & Moment Creation Flow

**Status:** MVP (Approved for build)
**Owner:** Solo Founder
**Last Updated:** 2026-02-14
**Target Release:** MVP Week 2-3 (after phone identity)
**Availability:** All users (anyone can become an organizer)
**Rationale:** First-time organizer experience is critical to MVP validation—if people don't create moments, the platform has no purpose.

---

## Context

_What I found in your files:_

- **Roadmap:** Group & moment creation is the **second MVP initiative** (1-2 week effort). Depends on phone-based identity (prd0001). Drives the outcome "Moments successfully created and shared" with a target of 10+ real-world moments.
- **Vision:** "It's hard for us to move together. Not because we don't care, but because we live in a world built to grab our attention, not channel our energy." This feature is the gateway—turning intent into action with minimal friction.
- **User story (Bob):** Bob is a first-time organizer in a small rural Oregon town (pop. 8,000). He's "never done anything remotely activist or remotely organizing before." After complaining about a gravel mine with friends for two weeks, he googles "how to organize a protest," finds turnout.network, and needs to go from zero to "moment is live" in <2 minutes or he'll lose momentum.
- **Ubiquitous Language:** Group = ongoing organizing entity (e.g., "Save Willow Creek"). Moment = specific call to action in space and time (e.g., "First Planning Meeting").
- **Strategic fit:** Solo founder, validation focus. Need to prove that "10+ real moments get created" to validate the concept. This is the make-or-break feature.

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
- **Casual organizers:** People who want to create one-off moments (community cleanups, mutual aid distributions, protest marches) without becoming "professional activists"
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
- **Roadmap confirms this is critical:** "Moments successfully created" is the first product outcome. If organizers don't create moments, nothing else matters.
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
| Time from landing → "moment is live"       | N/A     | <2 min | MVP launch   |
| Magic link click rate (submit → click SMS) | N/A     | ≥95%   | MVP launch   |
| Real moments created (with ≥1 RSVP)        | 0       | ≥10    | MVP lifetime |

### Leading Indicators (pre-launch signals)

| Metric                                        | Current | Target | What This Predicts                            |
| --------------------------------------------- | ------- | ------ | --------------------------------------------- |
| Internal dogfooding: create moment in <2 min  | N/A     | 100%   | Real users will complete flow quickly         |
| User testing: complete form without help      | N/A     | ≥80%   | Form fields are self-explanatory              |
| User testing: understand shareable link       | N/A     | 100%   | Organizers will know how to share their moment|
| Form validation errors per submission attempt | N/A     | <0.5   | Form is forgiving, not pedantic               |

💡 **Leading indicators help you course-correct before launch.** If user testing shows <80% completion without help, simplify the form before building the full flow.

---

## Proposed Solution

### How It Works

**Single-page form with psychological ordering** that creates both a group (ongoing organizing entity) and a moment (first event) in one flow, with phone verification at the end to prevent spam.

**Flow:**

1. User lands on turnout.network, clicks "Start Organizing" (no login required)
2. Single form appears with three sections (ordered intentionally):

   **Section 1: Your Group (Vision/Purpose)**
   - "What are you organizing for?" → Bob types "Stop the gravel mine from destroying willow creek"
   - "What are you calling your group?" → Auto-suggested "Save Willow Creek" (editable)
   - _Psychology: Start with meaning/purpose, not logistics—get Bob emotionally invested first_

   **Section 2: Your First Moment (Action/Logistics)**
   - "What's happening?" → Pre-filled "First Planning Meeting" (editable)
   - "Details" → Optional textarea for description
   - "Where?" → Location text input (geocoded for maps/directions)
   - "When?" → Date + time picker (local time, must be future)
   - _Psychology: Now that Bob is invested, concrete logistics feel achievable, not overwhelming_

   **Section 3: Who Are You? (Identity/Commitment)**
   - "Your name" → Random pseudonym pre-filled (e.g., "GreenWombat"), editable
   - "Your phone number" → Required for magic link
   - Help text: "We'll text you a link to manage 'Save Willow Creek' and share your moment"
   - _Psychology: Ask for personal info LAST, after Bob has already invested cognitive effort_

3. Bob clicks "Create & Share" → Form data captured in memory (NOT written to DB yet)
4. SMS sent via phone-based identity system (prd0001):
   ```
   Turnout: Click to confirm and create your moment "First Planning Meeting": [magic link]
   ```
5. Bob clicks magic link → NOW create group + moment in DB, authenticate Bob, redirect to dashboard
6. Dashboard shows:
   - "Your moment is live! 🎉"
   - Shareable link: `turnout.network/m/abc123` (copy button, quick share to SMS/email/Facebook)
   - RSVP count: 0 (updates live)
   - Next step prompt: "Share this with your group chat to get RSVPs"

**Key decisions:**

- **Single-page form, not multi-step wizard:** Reduces cognitive load (Bob can see entire commitment upfront), faster completion
- **Psychological ordering:** Vision → Action → Identity reduces abandonment (you don't ask for phone number first)
- **Pre-filled suggestions:** Random name, "First Planning Meeting" reduce friction (Bob can just accept defaults)
- **Phone verification AFTER form:** Prevents spam (no DB writes until phone verified), but doesn't add friction upfront
- **Group + moment created together:** Simplifies mental model for first-time organizers ("I'm creating a thing and it has a first event")

### User Stories (Examples)

**Story 1: Bob creates his first moment in <2 minutes**

- **As a** first-time organizer who's never used organizing tools before
- **I want to** go from "I should do something" to "here's a shareable link" in under 2 minutes
- **So that** I don't lose momentum or get overwhelmed by complexity

**Story 2: Bob shares his moment immediately after creation**

- **As an** organizer who just created a moment
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
- **No public group pages** — Groups are internal (for organizers to manage moments). Moments are public (for participants to RSVP). No "Save Willow Creek landing page" in MVP.
- **No multiple opportunities per moment** — Every moment just has one way to participate: "Show Up." Multiple roles (street medic, legal observer, safety coordinator) deferred to "Later."
- **No moment templates** — No "Create a protest" vs "Create a cleanup" with pre-filled fields. Just freeform text. Templates deferred to "Next" if organizers ask for them.
- **No group-level settings** — No privacy controls, no group descriptions beyond mission statement, no group member management. Collaboration (adding co-organizers) is prd0007.
- **No recurring moments** — No "every Tuesday at 6pm" option. Each moment is one-time. Recurrence deferred to "Later."
- **No draft mode** — Once Bob clicks the magic link, the moment is live. No "save as draft, publish later" option.

---

## Future Considerations

_These features are not in scope for MVP, but are likely enough in the near term that they should influence your architectural decisions today. Don't over-engineer for them, but don't paint yourself into a corner either._

| Future Capability | Likelihood | Design Hint |
| ----------------- | ---------- | ----------- |
| **Multiple opportunities per moment** (street medic, legal observer, etc.) | High (Later phase) | Don't hardcode "Show Up" as the only option. Model moments with a **many-to-many relationship to opportunities** (via join table) even though MVP creates a single default opportunity. When you create a moment, also create a default `Opportunity` record (name: "Show Up", unlimited slots). This costs almost nothing now but prevents a painful schema migration later. |
| **Group branding** (logos, colors, public pages) | High (Next phase) | Add nullable `logo_url`, `primary_color`, `secondary_color`, `about` fields to the `groups` table now, even if MVP doesn't use them. Frontend doesn't need to render them, but having the schema ready means "Next" phase is just UI work, not a migration. |
| **Moment templates** ("Create a protest" vs "Create a cleanup") | Medium (Next phase) | Store moment creation flow as **data, not code**. Example: `moment_templates` table with `name`, `description_prompt`, `default_title`, `suggested_fields`. MVP just has one template ("Blank"), but the system is designed to support many. Don't hardcode form fields in React components. |
| **Recurring moments** ("every Tuesday at 6pm") | Medium (Later phase) | Add optional `recurrence_rule` (nullable JSON or cron-like string) to `moments` table now. MVP leaves it null. When recurrence comes, you'll generate moment instances from the rule. Don't assume one moment = one event forever. |
| **Draft mode** (save as draft, publish later) | Low (Later phase) | Add `status` field to `moments` table (`draft | published | canceled | completed`) even though MVP only uses `published`. Don't assume all moments are public immediately. Future: let organizers save drafts. |

💡 **The pattern:** Model the **data schema** for future extensions now (costs ~zero), but don't build the **UI/logic** until needed. This prevents painful migrations later.

---

## Dependencies

### Feature Dependencies

- **Phone-based identity (prd0001):** REQUIRED. Magic link flow depends on this being implemented first. Can't build this until prd0001 is done.

### Team Dependencies

- **Solo founder** — No external team dependencies

### External Dependencies

- **Twilio SMS API (via prd0001):** Required for magic link delivery. If SMS delivery fails, organizers can't create moments.
- **Google Maps JavaScript API + Places API:** REQUIRED for MVP. Provides autocomplete widget for location input—Bob starts typing "Foster Library" and gets dropdown suggestions with full addresses. When Bob selects a place, we get `place_id`, `lat/long`, `formatted_address` immediately (no server-side geocoding needed). **Why required:** Alice's user story (user-stories.md line 34) shows "Give me Directions" button in reminders—can't provide maps links without location coordinates. Also needed for calendar invites (prd0003) and potentially check-in geofencing (prd0005). Cost: Places Autocomplete is ~$2.83 per 1,000 requests (well within budget for 10 moments in MVP). **Risk if delayed:** Participants can't get directions, breaks Alice's flow.

**Critical Path:** **Twilio SMS** (inherited from prd0001) AND **Google Maps Places API**. If magic links don't deliver, organizers can't create moments. If Places API is unavailable, Bob can't enter location (blocks moment creation—need fallback to plain text input).

💡 **Flag dependencies early to avoid last-minute surprises.** Test the full create-moment flow (form → SMS → click → dashboard) in staging before going live.

---

## Risks

_Risk types: V=Value, U=Usability, F=Feasibility, B=Business Viability. Impact: H=High, M=Medium, L=Low_

| Risk                                                                 | Type | Impact | Mitigation                                                                                                                                        |
| -------------------------------------------------------------------- | ---- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| No one creates moments (organizers don't adopt)                     | V    | H      | **This kills the MVP.** Pre-recruit 3-5 pilot organizers before launch. Offer to walk them through creating their first moment. If they won't use it, pivot or kill. |
| Single-page form is overwhelming (users abandon mid-form)            | U    | H      | **User test with 5 people before launch.** Watch them fill out the form. If >20% abandon, break into multi-step wizard. Track analytics: measure drop-off at each field. |
| Psychological ordering doesn't work (users confused by flow)         | U    | M      | User test: can users complete form without instructions? If confused, reorder fields (logistics first, identity last might be more familiar). |
| Phone verification step loses users (abandon after form submit)      | U    | M      | Track magic link click rate (target ≥95%). If <90%, add messaging: "Check your phone for a text from Turnout!" with visual SMS icon. |
| Pre-filled fields (random name, "First Planning Meeting") feel patronizing | U | M | User test: do users edit pre-filled fields or just accept them? If >50% edit, maybe remove pre-fills. If <20% edit, they're working as intended. |
| Form validation is too strict (rejects valid input)                  | U    | M      | Be forgiving: accept any text for location (even if geocoding fails—see risk above), accept future dates only (but don't enforce "must be >24 hours from now"). Monitor support requests for validation complaints. |
| Spam / abuse (bots creating fake moments)                            | B    | M      | Phone verification (prd0001) is first line of defense. Add honeypot fields (hidden inputs that bots fill but humans don't). Rate limiting: max N moments per phone number per day. |
| Google Places API fails to load / Bob bypasses autocomplete          | U    | M      | **Fallback:** If Places API fails to load (network issue, script blocked), fall back to plain text input. Show notice: "Enter a full address or landmark." Accept Bob's text as-is, but don't populate lat/long fields (participants won't get "Get Directions" button). Validate that Bob entered something (required field). Post-MVP: add server-side geocoding as fallback for plain text entries. |
| Bob selects wrong place from autocomplete (ambiguous names)          | U    | L      | Places Autocomplete shows formatted addresses in dropdown ("Foster Library - 651 E Main St, Ventura, CA"). Bob can see which one is correct. If Bob picks wrong one, he can edit location in dashboard later (post-MVP feature). For MVP, accept that Bob might make mistakes. |
| Google Maps API costs spiral with spam autocomplete requests         | B    | L      | Rate limiting prevents this (max N moments per phone per day). Autocomplete charges per session (~$2.83 per 1,000 sessions). Would need 1,000 spam moment creations to cost $2.83. Phone verification already blocks most spam. |
| Group name collisions ("Save Willow Creek" already exists)           | U    | L      | For MVP, allow duplicate group names—they have different UUIDs internally. Post-MVP: add search ("does this group already exist?") before creation. |
| Moment URL slug collisions (two moments get same short ID)           | F    | L      | Use cryptographically random short IDs (6-8 chars, base62 encoding). Collision probability is negligible. If collision occurs, regenerate. |

---

## Open Questions

_For each unknown, suggest a validation approach to turn assumptions into testable hypotheses._

| Question                                                              | Assumption                                              | How to Validate                                                                                  | Timeline           |
| --------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------ |
| Is single-page form better than multi-step wizard?                    | Single-page reduces cognitive load, faster completion  | Build both (low-fi prototypes). Test with 5 users each. Measure completion time and abandonment. | Before dev starts  |
| Does psychological ordering (vision → action → identity) reduce abandonment? | Yes, asking for phone number last reduces friction | A/B test: 50% see vision-first, 50% see phone-first. Measure completion rate.                   | Week 3-4 (staging) |
| Will organizers understand "group vs moment" distinction?              | Yes, it's intuitive ("Save Willow Creek" = ongoing, "First Planning Meeting" = specific event) | User test: ask users to explain back what they just created. If confused, simplify language or merge concepts. | Week 2-3 (staging) |
| Do pre-filled fields (random name, "First Planning Meeting") reduce friction or add confusion? | They reduce friction (users just accept defaults) | Track edit rate: what % of users edit pre-filled fields? If <20%, they're helpful. If >50%, remove them. | Post-launch (analytics) |
| Will organizers share their moment immediately after creation?        | Yes, they'll copy/paste link into group chat right away| Track time from "moment created" to "first RSVP." If median is <1 hour, sharing is working. If >24 hours, improve share UX. | Post-launch (analytics) |

---

## Before Finalizing

Before you ship this PRD, double-check:

- [x] Does `competitors.md` show competitors have this? — **No competitors.md file, but Eventbrite / Mobilize / Action Network all have "create event" flows. Ours is simpler (no account required, single form, group + moment together).**
- [x] Did you miss any recent user feedback that contradicts this approach? — **No user feedback yet (greenfield project). Bob's user story is the only validated input.**

---

## Sign-off

| Role        | Name          | Approved |
| ----------- | ------------- | -------- |
| Product     | Solo Founder  | ✅       |
| Engineering | Solo Founder  | ✅       |
| Design      | Solo Founder  | ✅       |

---

## Technical Implementation Notes

_Added for engineering handoff—not part of standard PRD template, but useful for solo dev context._

### Form Field Specifications

| Field                  | Type      | Validation                                    | Default Value              | Storage                     |
| ---------------------- | --------- | --------------------------------------------- | -------------------------- | --------------------------- |
| Group mission          | Text      | Required, 10-500 chars                        | None                       | `groups.mission`            |
| Group name             | Text      | Required, 3-100 chars                         | Auto-suggested from mission| `groups.name`               |
| Organizer name         | Text      | Required, 1-50 chars                          | Random pseudonym (e.g., "GreenWombat") | `users.display_name` |
| Phone number           | Tel       | Required, valid phone format (E.164)          | None                       | `users.phone_number`        |
| Moment name            | Text      | Required, 3-200 chars                         | "First Planning Meeting"   | `moments.name`              |
| Moment description     | Textarea  | Optional, max 2000 chars                      | None                       | `moments.description`       |
| Location               | Text      | Required, 5-500 chars                         | None                       | `moments.location`          |
| Date/Time              | DateTime  | Required, must be future (>= now + 1 hour)    | None                       | `moments.start_time` (UTC)  |

### Data Flow

1. **Location input (frontend, Google Places Autocomplete):**
   - Bob types in location field → Google Places Autocomplete shows dropdown suggestions
   - Bob selects "Foster Library - 651 E Main St, Ventura, CA 93001"
   - JavaScript captures from autocomplete response: `place_id`, `latitude`, `longitude`, `formatted_address`
   - Form now has structured location data (no server-side geocoding needed)
2. **Form submission:** Capture all fields in JSON including location data from autocomplete
3. **Encode into magic link token:** `{ group_mission, group_name, organizer_name, phone_number, moment_name, moment_description, location, place_id, latitude, longitude, formatted_address, start_time }`
4. **Token expiry:** 15 minutes (same as all magic links from prd0001)
5. **Magic link click:** Decode token, validate expiry, create resources in single DB transaction:
   - Upsert `users` (by phone_number)
   - Insert `groups` (with mission, name)
   - Insert `group_organizers` (link user to group)
   - Insert `moments` (in group, with details including location data from autocomplete)
   - Insert default `opportunities` (name: "Show Up", unlimited: true)
   - Generate short URL slug (6-8 char base62)
6. **Redirect:** Dashboard showing "moment is live" with shareable link

### Shareable URL Format

- **Long form:** `https://turnout.network/moments/{uuid}` (canonical)
- **Short form:** `https://turnout.network/m/{slug}` (for sharing—6-8 char base62, e.g., `turnout.network/m/a3Xk9Z`)
- Short URLs redirect to long URLs (permanent 301 redirect)
- Slug generation: `base62(random(48 bits))` = ~8 chars, 281 trillion combinations (collision probability negligible for MVP scale)

### Database Schema (Key Tables)

**`groups` table:**
- `id` (UUID, primary key)
- `name` (string, e.g., "Save Willow Creek")
- `mission` (text, e.g., "Stop the gravel mine from destroying willow creek")
- `logo_url` (nullable, for "Next" phase)
- `primary_color`, `secondary_color` (nullable, for "Next" phase)
- `about` (nullable text, for "Next" phase)
- `created_at` (timestamp)

**`moments` table:**
- `id` (UUID, primary key)
- `group_id` (foreign key to groups)
- `name` (string, e.g., "First Planning Meeting")
- `description` (text, nullable)
- `location` (string, e.g., "Foster Library - 651 E Main St, Ventura, CA 93001" — from Google Places Autocomplete selection, what Bob saw in dropdown)
- `place_id` (string, nullable — Google Maps Place ID from autocomplete, enables future features like "show on map", reviews, photos)
- `latitude`, `longitude` (decimal, nullable — from Places Autocomplete response, used for "Get Directions" links)
- `formatted_address` (string, nullable — e.g., "651 E Main St, Ventura, CA 93001" from Places API, canonical address format)
- `start_time` (timestamp, UTC)
- `status` (enum: `draft | published | canceled | completed`, default `published`)
- `recurrence_rule` (nullable, for "Later" phase)
- `short_slug` (string, unique, e.g., "a3Xk9Z")
- `created_at` (timestamp)

**`group_organizers` table (join table):**
- `group_id` (foreign key to groups)
- `organizer_id` (foreign key to users)
- `added_at` (timestamp)
- `added_by` (foreign key to users, nullable—null for founding organizer)

**`opportunities` table (for "Later" phase, but create now):**
- `id` (UUID, primary key)
- `moment_id` (foreign key to moments)
- `name` (string, e.g., "Show Up", "Street Medic", "Legal Observer")
- `description` (text, nullable)
- `max_slots` (integer, nullable—null means unlimited)
- `created_at` (timestamp)

**For MVP:** Every moment gets one default opportunity: `{ name: "Show Up", max_slots: null }`. This costs nothing but prepares for "Later" phase (multiple roles).

### Google Places Autocomplete Integration

**Frontend implementation:**

1. **Load Google Maps JavaScript API:**
   ```html
   <script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places&callback=initAutocomplete" async defer></script>
   ```

2. **Initialize Autocomplete on location input:**
   ```javascript
   const autocomplete = new google.maps.places.Autocomplete(
     document.getElementById('location-input'),
     { types: ['establishment', 'geocode'] } // Allows both places and addresses
   );
   ```

3. **Listen for place selection:**
   ```javascript
   autocomplete.addListener('place_changed', () => {
     const place = autocomplete.getPlace();
     // Extract data from place object:
     const location = place.formatted_address;
     const place_id = place.place_id;
     const latitude = place.geometry.location.lat();
     const longitude = place.geometry.location.lng();
     const formatted_address = place.formatted_address;

     // Store in form state for magic link token
   });
   ```

4. **Fallback for API failure:**
   - If Google Maps script fails to load, location input becomes plain text field
   - Show notice: "Enter a full address or landmark"
   - Accept Bob's input but don't populate lat/long fields
   - Form validation still requires location text (not empty)

**Cost notes:**
- Places Autocomplete (per session): $2.83 per 1,000 sessions
- A "session" = user interaction with autocomplete until they select a place or blur the field
- 10 moments created in MVP = ~10 sessions = $0.03 (negligible)

---

## Post-MVP Evolution

**If this approach succeeds:**
- Add group branding (logos, colors, public pages) in "Next" phase
- Add moment templates ("Create a protest" vs "Create a cleanup") if organizers ask for them
- Add server-side geocoding fallback for plain text location entries (if Places API fails)
- Add multiple opportunities per moment (street medic, legal observer) in "Later" phase

**If this approach fails:**
- **If form completion <90%:** Break into multi-step wizard (reduce cognitive load at each step)
- **If organizers don't create moments:** Simplify even further (remove group creation, just create standalone moments)
- **If organizers create moments but don't share them:** Improve post-creation UX (auto-open share dialog, add "share to group chat" templates)
