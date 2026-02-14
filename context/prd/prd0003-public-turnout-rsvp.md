# PRD: Public Turnout Pages + RSVP

**Status:** MVP (Approved for build)
**Owner:** Solo Founder
**Last Updated:** 2026-02-14
**Target Release:** MVP Week 4-5 (after turnout creation)
**Availability:** All users (public pages are world-readable, RSVP requires phone verification)
**Rationale:** If people can't easily discover and commit to turnouts, the network has no participants. This is Alice's gateway.

---

## Context

_What I found in your files:_

- **Roadmap:** Public turnout pages + RSVP is the **third MVP initiative** (1-2 week effort). Depends on group & turnout creation (prd0002) and phone identity (prd0001). Drives two outcomes: "Time to first RSVP" (target <24 hours) and "RSVPs convert to check-ins" (target ≥60%).
- **Vision:** "It's hard for us to move together... because we live in a world built to grab our attention, not channel our energy." Public pages are the first impression—they must be dead simple, shareable, and immediately actionable.
- **User story (Alice):** Alice (first-time participant) gets a link from a friend, clicks it, sees what/where/when, clicks RSVP, enters her phone number, gets an SMS, clicks the link, and she's in. The entire flow needs to be <30 seconds or she'll get distracted. Her user story (user-stories.md, lines 1-27) explicitly shows: "click here to confirm!" SMS, calendar invite, "Give me Directions" button.
- **Ubiquitous Language:** Turnout = organizing effort. Opportunity = way to participate (MVP: just "Show Up"). Engagement = participant's commitment to an opportunity. Participant = anyone who RSVPs.
- **Strategic fit:** Solo founder, validation focus. Need to prove "time from turnout creation to first RSVP <24 hours" and "10+ real turnouts get ≥1 RSVP." If turnouts are created but nobody RSVPs, the concept is dead.

---

## Problem

**What problem are we solving?**

Participants face massive friction when trying to commit to collective action:

1. **Discovery barriers:** "I heard about a protest but I don't know the details—where exactly? what time? who's organizing?"
2. **Commitment friction:** "I want to go but I'll probably forget—let me screenshot this and hope I remember to check my photos next week"
3. **Trust uncertainty:** "I don't know if anyone else is going—am I showing up alone?"
4. **Navigation obstacles:** "Where is 'the fairgrounds'? I need a maps link or I'll get lost"
5. **Account fatigue (first-time users):** "Do I have to create ANOTHER account just to say I'm coming? Forget it."
6. **Re-authentication friction (returning users):** "I already RSVP'd to something last week, why am I entering my phone number again?"

**Who experiences this problem?**

- **Alice (first-time participant):** Gets a link from a friend while standing on a street corner, distracted, on mobile. She's never heard of turnout.network before. She has ~30 seconds of attention before she gets distracted by the next notification.
- **Casual participants:** People who want to show up once or twice, not commit to a movement. "I'll come to the protest but don't make me join your mailing list."
- **Privacy-conscious participants:** Want to support the cause but don't want their name publicly associated with it (small town, employer concerns, etc.)

**In what situation?**

- Alice is in a Signal group chat with friends planning to attend an anti-ICE protest
- Someone shares a turnout.network link: `turnout.network/m/abc123`
- Alice clicks it on her phone (mobile browser, not app)
- **Critical moment:** The page loads. Alice has ~10 seconds to understand what this is before her attention drifts. If the page is confusing, slow, or asks for too much upfront, she backs out.
- If it's clear ("Melt ICE Protest, Saturday 10am, City Park, 23 people going, [RSVP now]"), she taps RSVP
- **Second critical moment:** The RSVP modal appears. If it asks for email/password/account creation, she abandons. If it just asks for phone number (familiar pattern from every food delivery app), she proceeds.

---

## Evidence

✅ **Validated:**

- **User story explicitly shows the flow:** Alice's user story (user-stories.md, lines 1-27) shows "friend texts Alice... follows that to the event page" → clicks RSVP → phone verification → SMS confirmation → calendar invite → directions button. This entire flow is specified.
- **Roadmap confirms criticality:** "Time from turnout creation to first RSVP <24 hours" is a product outcome. If turnouts sit with 0 RSVPs for days, shareability is broken.
- **Vision confirms shareability is core:** "Someone makes a moment. Someone shares it. Someone says yes." Public pages are the "shares it" and "says yes" part—the entire network depends on this working.
- **Architecture confirms constraints:** Phone-based identity (prd0001) already built, PWA for notifications, calendar .ics generation expected. Alice's user story shows "Add it to your calendar?" with one-click.
- **Open Door Principle from VISION.md:** "We prioritize participation over protection... open by design." Public pages must be world-readable, no login wall, no gatekeeping.

⚠️ **Assumed:**

- Public pages will be shared primarily via messaging apps (Signal, WhatsApp, text) → **Risk:** If most sharing happens on Facebook, link preview rendering becomes critical (OpenGraph tags)
- Participants will accept phone-number-only RSVP (no email option) → **Risk:** Privacy-conscious users may reject this (same risk as prd0001)
- Calendar .ics files work across all major calendar apps → **Risk:** Apple Calendar, Google Calendar, Outlook have subtle compatibility issues
- Public participant lists ("Alice, Bob, and 12 others are going") increase conversion → **Risk:** Might have opposite effect if people assume "enough people already, I'm not needed"

---

## Success Criteria

### Lagging Indicators (post-launch outcomes)

| Metric                                  | Current | Target  | Timeframe  |
| --------------------------------------- | ------- | ------- | ---------- |
| Time from turnout creation to first RSVP | N/A     | <24 hrs | MVP launch |
| RSVP completion rate - unauthenticated (click → confirmed) | N/A     | ≥80%    | MVP launch |
| RSVP completion rate - authenticated (click → confirmed) | N/A     | ≥95%    | MVP launch |
| Magic link click rate (submit → click SMS, unauth only) | N/A   | ≥95%    | MVP launch |
| Calendar file download rate             | N/A     | ≥60%    | MVP launch |
| Turnouts with ≥1 RSVP                   | 0       | ≥10     | MVP lifetime |

### Leading Indicators (pre-launch signals)

| Metric                                       | Current | Target | What This Predicts                          |
| -------------------------------------------- | ------- | ------ | ------------------------------------------- |
| Page load time (mobile, 3G)                  | N/A     | <2 sec | Alice won't abandon before seeing content   |
| Link preview renders in messaging apps       | N/A     | 100%   | Shareability—link looks good in Signal/WhatsApp |
| User testing: RSVP flow without instructions | N/A     | ≥80%   | Flow is self-explanatory                    |
| .ics file compatibility across calendar apps | N/A     | 100%   | Calendar invites work for everyone          |
| SSR rendering for social meta tags           | N/A     | 100%   | Link previews work (critical for sharing)   |

💡 **Leading indicators help you course-correct before launch.** If link previews don't render in Signal, fix OpenGraph tags before going live. If .ics files don't import to Apple Calendar, debug the RFC 5545 format.

---

## Proposed Solution

### How It Works

**Public turnout pages with authentication-aware RSVP flow** using phone-based magic links (prd0001) for first-time users and instant RSVP for authenticated users.

**Public Page (same for everyone):**

1. **Alice receives link** from friend: `turnout.network/m/abc123`
2. **Public page loads** (server-side rendered for fast load + link previews):
   - **What:** "Melt ICE Protest" (turnout name + description)
   - **When:** "Saturday, February 18, 2026 at 10:00 AM" (with relative time: "in 3 days")
   - **Where:** "City Park, 123 Main St" (with embedded map showing location pin)
   - **Who:** "Organized by Save Willow Creek" (group name + organizer display name)
   - **Social proof:** RSVP count displayed as soft number (e.g., "Over 20 people RSVP'd!" for 23 RSVPs, "A few people RSVP'd" for 3 RSVPs)
   - **CTA:** Big "RSVP Now" button (primary action, impossible to miss)

**Flow A: Unauthenticated User (First Time or No Session)**

3. **Alice clicks RSVP** → Check for session cookie → None found → Modal appears:
   - "Your phone number" (required, for SMS verification via prd0001)
   - "Your name" (pre-filled with random pseudonym like "BlueWombat", editable—this becomes her global display name)
   - Help text: "We'll text you a confirmation link"
4. **Alice submits** → Modal closes, "Check your messages!" screen appears
5. **SMS sent** (via prd0001 phone identity system):
   ```
   Turnout: Click to confirm your RSVP for Melt ICE Protest on Feb 18:
   [magic link]
   ```
6. **Alice clicks magic link** → Create user (with display_name), create engagement, authenticate Alice (create session), redirect to confirmation page
7. **Confirmation page** (see below)

**Flow B: Authenticated User (Has Session from Previous RSVP or Organizing)**

3. **Alice clicks RSVP** → Check for session cookie → Found → Engagement created immediately in DB (no modal, no SMS)
4. **Inline confirmation message appears:** "You're signed up as BlueWombat! 🎉" (shows current display name)
5. **Page updates:** RSVP count increments, "RSVP" button changes to "You're Going" (with option to cancel)
6. **Optional:** User can click through to confirmation page for calendar download + directions, or just stay on turnout page

**Confirmation Page (same for both flows):**

- "You're signed up for Melt ICE Protest! 🎉"
- "Add to calendar" button → downloads .ics file with event details + location + reminder
- "Get Directions" button → opens Google Maps with turnout location
- "Add turnout.network to homescreen" prompt (PWA install for reminders)
- Link back to turnout page (now shows updated RSVP count)

**Key decisions:**

- **Public turnout pages, no login wall:** Anyone can view turnout pages without authentication. Aligns with "Open Door Principle" from VISION.md.
- **Authentication-aware RSVP flow:** Check for session cookie before RSVP. If authenticated, instant RSVP (no modal). If not, phone magic link verification (prd0001). Reduces friction for returning users.
- **Phone verification only for unauthenticated users:** Prevents spam (no DB writes until phone verified) but only when needed. Authenticated users RSVP with one click.
- **No public participant lists:** MVP shows only RSVP count (softened: "Over 20 people RSVP'd!"), not participant names. Protects privacy, reduces complexity. Organizers see names in dashboard (prd0006), but other participants don't.
- **One global display name per user:** Set at first RSVP or group creation, used for all turnouts. No per-turnout pseudonyms (overengineered). Want to change it? Settings (post-MVP).
- **Server-side rendering (SSR):** Public pages must render server-side for link previews (OpenGraph/Twitter cards) and fast initial load.
- **Calendar .ics auto-generation:** Alice gets a one-click calendar file with turnout details, location, and reminder. Reduces "I forgot" abandonment.

### User Stories (Examples)

**Story 1: Alice RSVPs to her first turnout in <30 seconds**

- **As a** first-time participant who just received a link from a friend
- **I want to** understand what/where/when and commit to going in under 30 seconds
- **So that** I can say yes before I get distracted by the next notification

**Story 2: Alice adds the turnout to her calendar with one click**

- **As a** participant who just RSVP'd
- **I want to** add this to my calendar immediately (with location + reminder)
- **So that** I don't forget about it when the day comes

**Story 3: Alice RSVPs to a second turnout instantly (no SMS)**

- **As a** returning participant who already RSVP'd to a turnout last week
- **I want to** RSVP to this new turnout with one click (no phone number re-entry, no SMS, no modal)
- **So that** the experience is instant and I don't feel friction from re-authenticating

**Story 4: Alice sees social proof before committing**

- **As a** first-time participant deciding whether to go
- **I want to** see how many people are already going (softened count, not exact number or names)
- **So that** I know I'm not showing up alone, but without feeling like I'm being watched

---

## Non-Goals

What we're explicitly **NOT** doing in MVP:

- **No public participant lists** — No "Alice, Bob, and 21 others are going." Just softened count ("Over 20 people RSVP'd!"). Participant names are private—only visible to organizers in dashboard (prd0006). May never add public lists.
- **No detailed social proof** — No "3 of your friends are going" (requires social graph we don't have). Just RSVP count.
- **No capacity limits** — Unlimited RSVPs for MVP. No "50 spots remaining" messaging. Deferred to post-MVP.
- **No RSVP cancellation via web** — Once you RSVP, you can cancel via SMS reply (prd0004), but there's no "Cancel RSVP" button on the web. Web-based cancellation deferred to "Next."
- **No multiple opportunities** — Everyone RSVPs to "Show Up." No street medic, legal observer, etc. roles. Multiple opportunities deferred to "Later" (prd0002 Future Considerations).
- **No participant profiles** — RSVP doesn't create a profile page. Profiles deferred to "Later" (network effects phase).
- **No comments/discussion** — No "Ask a question" section on turnout pages. Use Signal/WhatsApp for coordination. Comments deferred to post-MVP if organizers request.
- **No custom URLs** — No `turnout.network/save-willow-creek/protest` vanity URLs. Just short random IDs (`/m/abc123`). Custom URLs deferred to "Next."

---

## Future Considerations

_These features are not in scope for MVP, but are likely enough in the near term that they should influence your architectural decisions today. Don't over-engineer for them, but don't paint yourself into a corner either._

| Future Capability | Likelihood | Design Hint |
| ----------------- | ---------- | ----------- |
| **Capacity limits** (e.g., "50 spots, 12 remaining") | High (Next phase) | Add nullable `max_participants` field to `opportunities` table now (already exists from prd0002). Frontend doesn't need to render it, but the schema is ready. When capacity comes, it's just UI + validation logic, not a migration. |
| **Multiple opportunities per turnout** (street medic, legal observer, etc.) | High (Later phase) | Don't hardcode RSVP flow to assume single opportunity. When creating engagement, link to `opportunity_id` (foreign key). MVP creates a default "Show Up" opportunity, but data model supports many. See prd0002 Future Considerations for details. |
| **RSVP cancellation via web** (cancel from turnout page, not just SMS) | Medium (Next phase) | MVP allows cancellation via SMS reply ("CANCEL" keyword, prd0004). Post-MVP: add "Cancel RSVP" button on turnout page for authenticated users. Just updates `engagements.status` to "canceled" and sets `canceled_at` timestamp. Schema already supports this. |
| **Participant profiles** (public history of turnouts attended) | Medium (Later phase) | When creating `engagements`, include `participant_id` (foreign key to `users`). For MVP, this enables us to dedupe RSVPs (same phone = same participant). For "Later," it enables profile pages ("Alice has attended 12 turnouts"). |
| **Comments/Q&A on turnout pages** | Low (Next phase, if requested) | Add `comments` table with `turnout_id`, `author_id`, `body`, `created_at`. Don't build UI, just leave the door open. If organizers ask for it post-MVP, the schema is ready. |
| **Custom vanity URLs** (e.g., `/save-willow-creek/protest`) | Low (Later phase) | Add nullable `custom_slug` field to `turnouts` table. MVP leaves it null (uses `short_slug` only). When vanity URLs come, check `custom_slug` first, fall back to `short_slug`. URL routing layer stays simple. |

💡 **The pattern:** Build the **data model** for extensibility (costs ~zero), but don't build the **UI/logic** until needed. This prevents painful migrations later.

---

## Dependencies

### Feature Dependencies

- **Phone-based identity (prd0001):** REQUIRED. Magic link flow for RSVP verification depends on this. Can't RSVP without phone verification.
- **Group & turnout creation (prd0002):** REQUIRED. Can't have public pages without turnouts to display. Must have `turnouts` table, `groups` table, `opportunities` table.

### Team Dependencies

- **Solo founder** — No external team dependencies

### External Dependencies

- **Twilio SMS API (via prd0001):** Required for magic link delivery. If SMS fails, participants can't confirm RSVPs.
- **Google Maps Embed API:** REQUIRED for MVP. Public pages show embedded map with turnout location pin. When Alice clicks map, opens Google Maps app for directions. **Cost:** Maps Embed API is free (unlimited embeds). **Why required:** Alice's user story shows "Give me Directions" button—can't provide this without map integration. **Risk if delayed:** Participants can't get directions, show-up rate drops.
- **Domain + HTTPS certificate:** Required for OpenGraph previews and PWA. Vercel provides automatic HTTPS, so no blocker.

**Critical Path:** **Twilio SMS** (inherited from prd0001) AND **Google Maps Embed API**. If magic links don't deliver, RSVP flow breaks. If map embeds don't load, participants can't get directions (breaks Alice's flow).

💡 **Flag dependencies early to avoid last-minute surprises.** Test the full RSVP flow (public page → RSVP modal → SMS → click → confirmation → calendar download → map directions) in staging before going live.

---

## Risks

_Risk types: V=Value, U=Usability, F=Feasibility, B=Business Viability. Impact: H=High, M=Medium, L=Low_

| Risk                                                                 | Type | Impact | Mitigation                                                                                                                                        |
| -------------------------------------------------------------------- | ---- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| No one RSVPs (turnouts created but 0 participants)                  | V    | H      | **This kills the MVP.** Pre-recruit pilot participants before launch. If organizers create turnouts but nobody RSVPs, problem is shareability (bad link previews?) or trust (who is this org?). Test with real users. |
| Public pages load slowly (>3 sec on mobile) → Alice abandons        | U    | H      | **Critical for mobile.** Use SSR (Next.js), optimize images, minimize JS bundle. Test on real 3G network (not just fast wifi). Target <2 sec load time. |
| Link previews don't render in messaging apps (Signal, WhatsApp)     | U    | H      | **Breaks shareability.** Implement OpenGraph + Twitter Card meta tags. SSR required (client-side React won't work). Test link previews in Signal, WhatsApp, iMessage before launch. |
| Calendar .ics files don't import correctly (Apple Calendar, Google) | U    | M      | **Alice won't remember to show up.** Follow RFC 5545 spec strictly. Test .ics import in Apple Calendar, Google Calendar, Outlook. Include VALARM reminder (1 hour before). |
| Phone-only RSVP blocks privacy-conscious users                      | V    | M      | Same risk as prd0001. Accept for MVP—aligns with "open door" principle. If users reject phone-only, add email option in "Next" phase. Random pseudonyms by default help ("BlueWombat" vs "Alice Smith"). |
| Softened counts feel imprecise / reduce trust ("Over 20" = 23 or 200?) | V    | L      | Test with pilot users: does "Over 20 people" feel trustworthy vs "23 people"? Exact count might be better. Easy to A/B test post-launch. |
| Map embeds don't load (API key issues, rate limits)                 | U    | M      | **Fallback:** If Maps Embed API fails, show location as text with "Get Directions" link to `maps.google.com/?q=[address]`. Still works, just less polished. |
| RSVP completion rate <80% (people click RSVP but abandon modal)     | U    | M      | Track analytics: where do people drop off? If phone number field is the blocker, add help text ("We'll text you a link, no account needed"). If abandonment is >20%, simplify further. |
| Spam RSVPs (bots submitting fake phone numbers)                     | B    | M      | Phone verification (prd0001) blocks most spam. Add honeypot fields (hidden inputs bots fill). Rate limiting: max N RSVPs per phone per day. Monitor for abuse. |
| Social proof backfires ("only 2 people going, I'll skip")           | V    | L      | For low-RSVP turnouts, consider hiding count until threshold (e.g., don't show "2 people" but do show "23 people"). Test with pilot users. Post-MVP: let organizers toggle visibility. |
| Session expiry breaks authenticated RSVP (Alice thinks she's logged in but isn't) | U | M | Sessions are non-expiring (prd0001), so this should be rare. If it happens, fallback gracefully: detect expired session, show phone number modal instead. Monitor session expiry rate. |

---

## Open Questions

_For each unknown, suggest a validation approach to turn assumptions into testable hypotheses._

| Question                                                              | Assumption                                              | How to Validate                                                                                  | Timeline           |
| --------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------ |
| Does social proof (RSVP count) increase RSVP conversion?       | Yes, people want to know they're not showing up alone  | A/B test: 50% see count, 50% don't. Measure RSVP rate. If no difference or negative, hide counts. | Week 5-6 (staging) |
| Should counts be exact ("23 people") or softened ("Over 20 people")? | Softened feels less precise but more approachable | A/B test exact vs softened. Measure RSVP rate and user trust. If no difference, exact is simpler. | Week 5-6 (staging) |
| Will participants download calendar .ics files, or ignore them?       | Most will download (helps with follow-through)         | Track download rate post-launch. If <30%, calendar integration isn't valuable. If >60%, it's working. | Post-launch (analytics) |
| Do link previews (OpenGraph) in messaging apps increase shareability? | Yes, seeing image/title/description in Signal increases clicks | Track referrer data: how many clicks come from messaging apps? If low, investigate why (maybe previews aren't rendering). | Post-launch (analytics) |
| Will "private by default" reduce social proof effectiveness?          | Yes, but privacy is more important for MVP              | Track: what % of participants opt-in to public? If >50%, social proof might be working. If <10%, consider making public default with opt-out. | Post-launch (analytics) |

---

## Before Finalizing

Before you ship this PRD, double-check:

- [x] Does `competitors.md` show competitors have this? — **No competitors.md file, but Eventbrite / Mobilize / Action Network all have public event pages + RSVP. Ours is simpler (no account required, phone-only verification).**
- [x] Did you miss any recent user feedback that contradicts this approach? — **No user feedback yet (greenfield project). Alice's user story is the only validated input.**

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
- Add capacity limits ("50 spots, 12 remaining") in "Next" phase
- Add web-based RSVP cancellation (cancel button on turnout page, not just SMS) in "Next" phase
- Add user profile settings (change global display name) in "Next" phase
- Add multiple opportunities per turnout (street medic, legal observer) in "Later" phase
- Add participant profiles (public RSVP history) in "Later" phase

**If this approach fails:**
- **If RSVP completion <80% (unauthenticated):** Simplify modal further (auto-generate name, just phone number). Or remove phone verification (accept spam risk).
- **If time to first RSVP >24 hours:** Improve shareability (better link previews, share templates, pre-written messages).
- **If turnouts get RSVPs but low show-up rate:** Problem might be reminders (prd0004) or check-in UX (prd0005), not RSVP flow.
