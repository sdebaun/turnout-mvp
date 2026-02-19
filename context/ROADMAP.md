# Turnout.Network MVP Roadmap

_Last updated: 2026-02-13 (revised: added organizer auth, collaboration, multi-turnout dashboard to MVP)_

---

## Context

**What I pulled from your files:**

- **Vision:** A living network of showing up—helping people create turnouts, commit to them, and build momentum through action (VISION.md)
- **Core user flows:** Bob (first-time organizer), Alice (first-time participant), Cathy (experienced organizer - incomplete) (user-stories.md)
- **Ubiquitous language:** Turnout, Opportunity, Engagement, Location, Participant, Organizer, Testimonial, Profile (UL.md)
- **Philosophical foundation:** Converting "caring" from sentiment to action, providing logistics for collective coordination (INSPIRATION.md)

**Current state:**

- Greenfield project, no existing code
- Documentation and vision complete
- Ready to build

---

## Planning Context

**Planning Period:** MVP (Timeline TBD — scope-complete, not date-driven)

**Team Capacity:** Solo founder — requires ruthless prioritization and technical simplicity

**Constraints:**

- Free/low budget → Serverless architecture, pay-as-you-go services only
- Solo execution → Minimize complexity, maximize leverage
- Validation focus → Ship fast, learn fast, iterate

**Technical Approach:**

- Next.js 14+ (App Router) with SST v3 (Ion) on AWS (Lambda@Edge + CloudFront)
- Postgres via Neon (serverless DB, free tier)
- AWS EventBridge for scheduled reminder jobs (no platform limits)
- Hybrid notifications: PWA (free) with SMS fallback (Twilio, ~$0.0079/SMS)
- TypeScript throughout, infrastructure as code via SST

See [@context/ARCHITECTURE.md](./context/ARCHITECTURE.md) for detailed stack decisions.

---

## Business Objective

| Objective                                                                  | Source                      | Key Metric                                                         |
| -------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------ |
| Validate that turnout.network enables real coordination and follow-through | User research, vision docs  | 70% of turnouts get ≥1 RSVP; 60% of RSVPs result in actual check-in |
| Prove the core loop works: create → share → commit → show up               | User stories (Bob + Alice)  | 10+ real-world turnouts created, 50+ participants RSVPd             |
| Demonstrate that reminders drive follow-through                            | Alice's user story, line 25 | Measurable difference in show-up rate with vs without reminders    |

---

## Leading Product Outcomes

_The measurable product changes that will indicate whether the business objectives are being met_

| Outcome                                 | Drives Objective               | Current           | Target      | How We'll Measure                                         |
| --------------------------------------- | ------------------------------ | ----------------- | ----------- | --------------------------------------------------------- |
| Turnouts successfully created and shared | Validate core loop             | 0                 | 10+ turnouts | Count of turnouts with ≥1 RSVP                             |
| RSVPs convert to check-ins              | Coordination actually works    | 0% (no data)      | ≥60%        | Check-ins / RSVPs                                         |
| Participants respond to reminders       | Reminders drive follow-through | 0% (no data)      | ≥40%        | % of reminder recipients who confirm/interact             |
| Organizers see value and return         | Validate organizer experience  | 0% (no data)      | ≥30%        | % of organizers who create a 2nd turnout within 30 days    |
| Time from turnout creation to first RSVP | Shareability validation        | N/A (no baseline) | <24 hours   | Median time-to-first-RSVP across all turnouts              |
| Participants would recommend to others  | Network growth potential       | 0% (no data)      | ≥70% "yes"  | Post-event survey: "Would you invite others to use this?" |

---

## Now: MVP Core Loop

_The absolute minimum to validate the concept_

### What We're Building

The smallest possible slice that lets Bob organize a turnout and Alice show up to it. Everything else is deferred.

| Initiative                             | Drives Outcome                    | Owner | Dependencies                   | Effort (Optimistic) | Effort (Realistic) |
| -------------------------------------- | --------------------------------- | ----- | ------------------------------ | ------------------- | ------------------ |
| **Bootstrap infrastructure**           | Enable development                | You   | None                           | —                   | 1-2w               |
| **Organizer phone-based auth**         | Organizers return, durability     | You   | Bootstrap                      | 1w                  | 1.5-2w             |
| **Group & turnout creation**            | Turnouts successfully created      | You   | Organizer auth                 | 1-2w                | 1.5-2w             |
| **Public turnout pages + RSVP**         | Time to first RSVP, RSVPs convert | You   | Group & turnout creation        | 1-2w                | 1.5-2w             |
| **SMS verification + reminder system** | Reminders drive follow-through    | You   | RSVP flow, Twilio account      | 1w                  | 1.5-2w             |
| **Check-in system**                    | RSVPs convert to check-ins        | You   | RSVP flow                      | 1w                  | 1-1.5w             |
| **Group dashboard**                    | Organizers return, create more    | You   | Organizer auth, group creation | 3-5d                | 1w                 |
| **Group-level collaboration**          | Prevent organizer burnout         | You   | Group dashboard                | 2-3d                | 3-5d               |

**Total estimated effort:**
- **Optimistic (original):** 7-9 weeks
- **Realistic (with infrastructure + buffer):** 12-16 weeks

This assumes solo human developer working full-time, with realistic buffer for: infrastructure setup, AWS debugging, 10DLC registration delays, cross-browser PWA issues, user testing, and late-night deployment fires.

**Note on estimates:** These are calibrated for a **solo human developer**. We expect agent teams to be significantly faster, but we're tracking actuals vs. the REALISTIC estimates to measure the velocity multiplier. See time tracking table below.

---

### Time Tracking: Estimates vs. Actuals

**Purpose:** Measure agent team velocity against solo human developer baseline. Update "Actual" and "Notes" columns as work completes.

| Initiative                             | Estimated (Human Solo, Realistic) | Actual (Agent Teams) | Velocity Multiplier | Notes |
| -------------------------------------- | --------------------------------- | -------------------- | ------------------- | ----- |
| **Bootstrap infrastructure**           | 1-2w                              | 1.5 days             | ~7x                 | Started Mon Feb 16 morning, done Tue Feb 17 evening |
| **Organizer phone-based auth**         | 1.5-2w                            | 1.5 days             | ~7x                 | Started Feb 18, merged+deployed Feb 19. Includes 3 hotfix PRs for missing prod migration step — deploy pipeline bug, not feature work. |
| **Group & turnout creation**            | 1.5-2w                            | _pending_            | —                   |       |
| **Public turnout pages + RSVP**         | 1.5-2w                            | _pending_            | —                   |       |
| **SMS verification + reminder system** | 1.5-2w                            | _pending_            | —                   |       |
| **Check-in system**                    | 1-1.5w                            | _pending_            | —                   |       |
| **Group dashboard**                    | 1w                                | _pending_            | —                   |       |
| **Group-level collaboration**          | 3-5d                              | _pending_            | —                   |       |
| **TOTAL MVP**                          | 12-16 weeks                       | _pending_            | —                   |       |

**How to update:**
- **Actual:** Record calendar time from start to "feature complete + tests passing" (not just code written)
- **Velocity Multiplier:** Calculate as `Estimated / Actual` (e.g., 1w estimate / 2d actual = 3.5x faster)
- **Notes:** Capture blockers, surprises, or context that affected timeline

**Expected outcome:** If agent teams are 2-5x faster than solo humans, the MVP timeline becomes 2.5-8 weeks instead of 12-16 weeks (optimistic case: 2-3 weeks).

---

### Feature Specifications

Detailed feature specifications have been extracted into individual PRD files for AI agent handoffs:

1. **Phone-Based Identity System** [prd/prd0001-phone-identity.md](../prd/prd0001-phone-identity.md)
   - OTP code authentication for all users (WebOTP API for mobile autofill)
   - Non-expiring session cookies
   - Phone number as universal identity

2. **Group & Turnout Creation Flow** [prd/prd0002-group-turnout-creation.md](../prd/prd0002-group-turnout-creation.md)
   - First-time organizer experience
   - Single-page form with psychological ordering (vision → action → identity)
   - Resources created after phone verification

3. **Public Turnout Pages + RSVP** [prd/prd0003-public-turnout-rsvp.md](../prd/prd0003-public-turnout-rsvp.md)
   - Public turnout page requirements
   - RSVP modal with phone verification
   - Calendar .ics file generation

4. **SMS Reminder System** [prd/prd0004-sms-reminders.md](../prd/prd0004-sms-reminders.md)
   - Hybrid PWA/SMS notification strategy
   - Reminder timing and scheduling
   - SMS reply keyword handling

5. **Check-in System** [prd/prd0005-checkin.md](../prd/prd0005-checkin.md)
   - Location-based, manual, and organizer check-in options
   - Time window logic
   - RSVP-to-check-in conversion tracking

6. **Group Dashboard** [prd/prd0006-group-dashboard.md](../prd/prd0006-group-dashboard.md)
   - Multi-group selection
   - Upcoming/past turnouts view
   - Single-turnout dashboard with RSVP management

7. **Group-Level Collaboration** [prd/prd0007-collaboration.md](../prd/prd0007-collaboration.md)
   - Co-organizer invitation and access
   - Equal permissions model (no roles for MVP)
   - Group-level sharing to prevent organizer burnout

---

## Next: Usability & Retention

_After validating the core loop, make it easier to use and more likely to stick_

| Initiative                            | Drives Outcome                   | Owner | Dependencies        |
| ------------------------------------- | -------------------------------- | ----- | ------------------- |
| **Group branding & public pages**     | Professional organizing identity | You   | MVP core loop       |
| **Participant profiles (opt-in)**     | Network effects start to emerge  | You   | MVP core loop       |
| **Post-event feedback collection**    | Learn what's working/not working | You   | Check-in system     |
| **SMS reply intelligence**            | Reduce friction, better data     | You   | SMS reminder system |
| **Calendar integration improvements** | Increase show-up rate            | You   | Public turnout pages |
| **Organizer permissions/roles**       | Safety for larger organizing     | You   | Group collaboration |

### Why Next

These features improve the experience for people who've already used the MVP and found value.

**Group branding & public pages:** MVP has basic groups (name + organizers). This adds branding (logos, colors), public group pages (like "Save Willow Creek" landing page), about sections, and featured turnouts. Important for established organizing groups, but not needed to validate the core loop.

**Organizer permissions/roles:** MVP gives all group organizers equal permissions. If this causes problems (bad actors, accidental deletions), add owner/admin/editor roles. Don't build it until the problem is real.

Everything else: build network effects (profiles), improve data quality (feedback, SMS intelligence), optimize conversion (calendar improvements).

---

## Later: Network Effects & Scale

_The vision stuff—deferred until we've proven the core loop works_

| Initiative                          | Drives Outcome                           | Reason for Deferral                                  |
| ----------------------------------- | ---------------------------------------- | ---------------------------------------------------- |
| **Turnout discovery**                | Participant retention, cross-pollination | Requires critical mass of turnouts to be useful       |
| **Testimonials**                    | Trust-building, organizer credibility    | Only valuable if people are coming back              |
| **Engagement history (reputation)**    | Network effects, repeat participation    | Requires multiple turnouts per participant            |
| **Opportunities (multiple roles)**  | Enable complex turnouts (medics, etc.)    | Adds complexity; validate simple case first          |
| **Privacy/security hardening**      | Safety for high-risk organizing          | Important, but not blocking for low-risk MVP testing |
| **Advanced reminder customization** | Improve show-up rates                    | Optimize after we know baseline rates                |

### Why Later

These are all important to the long-term vision, but they're premature before we validate that:

1. People will create turnouts
2. People will RSVP
3. People will actually show up

Build the network, then build the network effects.

---

## Dependencies & Risks

| Risk                                            | Impact | Mitigation                                                                  | Owner |
| ----------------------------------------------- | ------ | --------------------------------------------------------------------------- | ----- |
| SMS costs spiral with spam RSVPs                | High   | Phone verification, rate limiting, honeypot fields                          | You   |
| No one creates turnouts (organizers don't adopt) | High   | User testing with real organizers, pre-recruit pilot users                  | You   |
| RSVPs don't convert to check-ins                | High   | This is what we're testing—if it fails, pivot or kill                       | You   |
| Co-organizer abuse (bad actors delete turnouts)  | Medium | For MVP, accept the risk. Add roles/permissions in Next if it happens       | You   |
| OTP code interception/account takeover          | Medium | Short code expiry (10min), single-use codes, rate limiting                  | You   |
| Geolocation/check-in feels creepy               | Medium | Make check-in manual/opt-in, clear privacy messaging                        | You   |
| Solo dev burnout                                | Medium | Ruthless scope discipline, celebrate small wins, timebox MVP to 10-12 weeks | You   |
| SMS delivery failures (carrier blocking)        | Medium | Use reputable SMS provider (Twilio), proper opt-in language                 | You   |
| Serverless cold starts hurt UX                  | Low    | Provisioned concurrency: 1 always-hot Lambda instance (~$11/month). See ARCHITECTURE.md. | You   |

---

## Success Criteria for MVP

**The MVP is in learning mode, not validation mode.** With 10 turnouts and 50 participants, we're establishing baselines and gathering qualitative signal—not proving statistical significance.

### What We're Measuring (Baselines)

Record these metrics to establish what "normal" looks like. No targets, no pass/fail. Just data.

| Baseline Metric                         | Why It Matters                                                    |
| --------------------------------------- | ----------------------------------------------------------------- |
| RSVP → Check-in conversion rate         | Establishes baseline for v2 optimization                          |
| Time from creation → first RSVP (median) | Measures how fast organizers get traction                         |
| Feature usage rates                     | Which features get used? (calendar add, directions, check-in)     |
| Cancellation patterns                   | When do people flake? (day-of vs. never intended)                 |
| SMS vs. PWA notification mix            | Helps optimize notification strategy                              |
| Organizer return rate                   | Do they come back unprompted?                                     |

### What We're Validating (Qualitative)

**Exit interviews with organizers (after each turnout):**
- "Would you use this again for your next event?"
- "What was easier than your old method? What was harder?"
- "What broke or confused you?"
- "Did this solve a real problem, or am I solving a problem I *think* you have?"
- "What's missing that would make this a no-brainer?"

**Exit interviews with participants (sample 10-15 after turnouts):**
- "Was this easier than usual?"
- "Did the reminders help or annoy you?"
- "What confused you?"
- "Would you click a link like this again?"

### What Success Looks Like

**You've learned enough to build v2 if you can answer:**

1. ✅ **What's the actual RSVP-to-check-in conversion rate?** (so you know what to optimize)
2. ✅ **Would 3+ organizers use this again without you asking?** (behavioral signal > self-report)
3. ✅ **What's the #1 thing that sucked?** (so you know what to fix first)
4. ✅ **Is the core hypothesis true?** Does making it stupidly simple increase follow-through? (qualitative signal from interviews)

**You haven't learned enough if:**

- ❌ Organizers say "it's fine I guess" but don't come back
- ❌ Participants are confused by basic flows
- ❌ Nobody actually checks in (feature doesn't work or isn't valued)
- ❌ The answer to "did this solve a real problem?" is "not really"

**Then what?**

- If the qualitative signal is strong (people want to use it again), proceed to "Next" features and iterate on what sucked
- If the qualitative signal is weak (meh responses, no return usage), figure out why: wrong audience? wrong problem? wrong solution?

---

## Parking Lot

_Ideas considered but explicitly deferred:_

- **Canary passwords / warrant canaries** (future-ideas.md) — Important for high-stakes organizing, but overkill for MVP validation
- **Testimonial approval flow** (future-ideas.md) — Testimonials are post-MVP
- **LLM sock puppet detection** (future-ideas.md) — Solve spam manually first, automate later
- **Native mobile apps** — PWA is good enough for MVP
- **Internationalization** — Start with English/US, expand if validated
- **Accessibility audit** — Important, but not blocking for initial validation with pilot users
- **Cathy's user story completion** — Experienced organizer flows can wait until we validate Bob
- **Ephemeral PR deployments + E2E CI** — On PR open, spin up a per-branch SST stage, run Playwright E2E against it, tear it down. High value but needs: Neon branch DB per PR, SST per-branch deploy, Playwright in CI, secrets management. Revisit after E2E suite is mature.

---

## Assumptions to Validate

⚠️ **Tech stack assumption:** You're comfortable with web development (JS/TS, React/Vue/Svelte, serverless functions). If not, this timeline is fantasy.

⚠️ **User recruitment:** You have a plan to get 3-5 real organizers to pilot this. If you build it and no one comes, you'll learn nothing.

⚠️ **SMS is acceptable:** We're assuming participants are okay with SMS. If your audience skews toward privacy-conscious folks who won't give phone numbers, this approach fails.

⚠️ **Geolocation for check-in:** Assuming participants will allow location access. If not, manual check-in must be frictionless.

⚠️ **"Free forever" is sustainable:** With pay-as-you-go SMS and serverless hosting, MVP costs should be <$50/month for 10 turnouts, 50 participants, assuming moderate SMS volume (3 reminders/participant + auth messages). Validate this with real usage.

⚠️ **Phone-based identity is acceptable:** We're betting that phone-number-based OTP auth is "good enough" for MVP. No passwords, no email verification. If organizers feel this is too insecure for sensitive organizing, we'll need to add proper auth (email, 2FA, etc.).

---

## Next Steps

1. **Validate these assumptions with a human:** Show this roadmap to 2-3 potential organizers. Ask:
   - Would you use this?
   - What's missing that would block you?
   - What's here that you don't need?

2. **Pick your tech stack:** Choose your serverless platform, database, and SMS provider. Set up accounts.

3. **Build the MVP in phases:**
   - Week 1: Organizer auth (OTP codes)
   - Week 2-3: Turnout creation + public pages
   - Week 4-5: RSVP + SMS verification
   - Week 6: Reminders + check-in
   - Week 7: Multi-turnout dashboard + collaboration
   - Week 8-9: Polish, bug fixes, pilot prep

4. **Recruit pilot organizers:** Find 3-5 people planning real events in the next 30-60 days. Offer to build this for them in exchange for feedback.

5. **Ship, measure, learn:** Get the MVP into the world. Watch what happens. Iterate or pivot based on data.

---

## Roadmap Philosophy

This roadmap follows two principles:

**1. Objective → Outcome → Initiative**
Every feature connects to a measurable product outcome (like "60% RSVP-to-check-in conversion"), which connects to a business goal (like "validate coordination works"). If a feature doesn't connect to an outcome, it's cut.

**2. Now/Next/Later (Janna Bastow, ProdPad)**
Instead of fixed dates, we organize by priority and time horizons. This makes the roadmap resilient to reality—which, as a solo founder, will absolutely show up uninvited.

---

_Built with the roadmap skill. Questions? Disagree with priorities? Let's argue about it._
