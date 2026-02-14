# Turnout.Network MVP Roadmap

_Last updated: 2026-02-13 (revised: added organizer auth, collaboration, multi-moment dashboard to MVP)_

---

## Context

**What I pulled from your files:**

- **Vision:** A living network of showing up—helping people create moments, commit to them, and build momentum through action (VISION.md)
- **Core user flows:** Bob (first-time organizer), Alice (first-time participant), Cathy (experienced organizer - incomplete) (user-stories.md)
- **Ubiquitous language:** Moment, Opportunity, Turnout, Participant, Organizer, Testimonial, Profile (UL.md)
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

- Next.js on Vercel (serverless, branch deployments)
- Postgres via Neon (serverless DB, free tier)
- Hybrid notifications: PWA (free) with SMS fallback (Twilio, ~$0.0079/SMS)
- TypeScript throughout, self-hostable exit strategy

See [@context/ARCHITECTURE.md](./context/ARCHITECTURE.md) for detailed stack decisions.

---

## Business Objective

| Objective                                                                  | Source                      | Key Metric                                                         |
| -------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------ |
| Validate that turnout.network enables real coordination and follow-through | User research, vision docs  | 70% of moments get ≥1 RSVP; 60% of RSVPs result in actual check-in |
| Prove the core loop works: create → share → commit → show up               | User stories (Bob + Alice)  | 10+ real-world moments created, 50+ participants RSVPd             |
| Demonstrate that reminders drive follow-through                            | Alice's user story, line 25 | Measurable difference in show-up rate with vs without reminders    |

---

## Leading Product Outcomes

_The measurable product changes that will indicate whether the business objectives are being met_

| Outcome                                 | Drives Objective               | Current           | Target      | How We'll Measure                                         |
| --------------------------------------- | ------------------------------ | ----------------- | ----------- | --------------------------------------------------------- |
| Moments successfully created and shared | Validate core loop             | 0                 | 10+ moments | Count of moments with ≥1 RSVP                             |
| RSVPs convert to check-ins              | Coordination actually works    | 0% (no data)      | ≥60%        | Check-ins / RSVPs                                         |
| Participants respond to reminders       | Reminders drive follow-through | 0% (no data)      | ≥40%        | % of reminder recipients who confirm/interact             |
| Organizers see value and return         | Validate organizer experience  | 0% (no data)      | ≥30%        | % of organizers who create a 2nd moment within 30 days    |
| Time from moment creation to first RSVP | Shareability validation        | N/A (no baseline) | <24 hours   | Median time-to-first-RSVP across all moments              |
| Participants would recommend to others  | Network growth potential       | 0% (no data)      | ≥70% "yes"  | Post-event survey: "Would you invite others to use this?" |

---

## Now: MVP Core Loop

_The absolute minimum to validate the concept_

### What We're Building

The smallest possible slice that lets Bob organize a moment and Alice show up to it. Everything else is deferred.

| Initiative                             | Drives Outcome                    | Owner | Dependencies                   | Effort |
| -------------------------------------- | --------------------------------- | ----- | ------------------------------ | ------ |
| **Organizer phone-based auth**         | Organizers return, durability     | You   | None                           | 1w     |
| **Group & moment creation**            | Moments successfully created      | You   | Organizer auth                 | 1-2w   |
| **Public moment pages + RSVP**         | Time to first RSVP, RSVPs convert | You   | Group & moment creation        | 1-2w   |
| **SMS verification + reminder system** | Reminders drive follow-through    | You   | RSVP flow, Twilio account      | 1w     |
| **Check-in system**                    | RSVPs convert to check-ins        | You   | RSVP flow                      | 1w     |
| **Group dashboard**                    | Organizers return, create more    | You   | Organizer auth, group creation | 3-5d   |
| **Group-level collaboration**          | Prevent organizer burnout         | You   | Group dashboard                | 2-3d   |

**Total estimated effort:** 7-9 weeks (solo, assuming full-time equivalent focus)

---

### Feature Specifications

Detailed feature specifications have been extracted into individual PRD files for AI agent handoffs:

1. **Phone-Based Identity System** [prd/prd0001-phone-identity.md](../prd/prd0001-phone-identity.md)
   - Magic link authentication for all users
   - Non-expiring session cookies
   - Phone number as universal identity

2. **Group & Moment Creation Flow** [prd/prd0002-group-moment-creation.md](../prd/prd0002-group-moment-creation.md)
   - First-time organizer experience
   - Single-page form with psychological ordering (vision → action → identity)
   - Resources created after phone verification

3. **Public Moment Pages + RSVP** [prd/prd0003-public-moment-rsvp.md](../prd/prd0003-public-moment-rsvp.md)
   - Public moment page requirements
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
   - Upcoming/past moments view
   - Single-moment dashboard with RSVP management

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
| **Calendar integration improvements** | Increase show-up rate            | You   | Public moment pages |
| **Organizer permissions/roles**       | Safety for larger organizing     | You   | Group collaboration |

### Why Next

These features improve the experience for people who've already used the MVP and found value.

**Group branding & public pages:** MVP has basic groups (name + organizers). This adds branding (logos, colors), public group pages (like "Save Willow Creek" landing page), about sections, and featured moments. Important for established organizing groups, but not needed to validate the core loop.

**Organizer permissions/roles:** MVP gives all group organizers equal permissions. If this causes problems (bad actors, accidental deletions), add owner/admin/editor roles. Don't build it until the problem is real.

Everything else: build network effects (profiles), improve data quality (feedback, SMS intelligence), optimize conversion (calendar improvements).

---

## Later: Network Effects & Scale

_The vision stuff—deferred until we've proven the core loop works_

| Initiative                          | Drives Outcome                           | Reason for Deferral                                  |
| ----------------------------------- | ---------------------------------------- | ---------------------------------------------------- |
| **Moment discovery**                | Participant retention, cross-pollination | Requires critical mass of moments to be useful       |
| **Testimonials**                    | Trust-building, organizer credibility    | Only valuable if people are coming back              |
| **Turnout history (reputation)**    | Network effects, repeat participation    | Requires multiple moments per participant            |
| **Opportunities (multiple roles)**  | Enable complex moments (medics, etc.)    | Adds complexity; validate simple case first          |
| **Privacy/security hardening**      | Safety for high-risk organizing          | Important, but not blocking for low-risk MVP testing |
| **Advanced reminder customization** | Improve show-up rates                    | Optimize after we know baseline rates                |

### Why Later

These are all important to the long-term vision, but they're premature before we validate that:

1. People will create moments
2. People will RSVP
3. People will actually show up

Build the network, then build the network effects.

---

## Dependencies & Risks

| Risk                                            | Impact | Mitigation                                                                  | Owner |
| ----------------------------------------------- | ------ | --------------------------------------------------------------------------- | ----- |
| SMS costs spiral with spam RSVPs                | High   | Phone verification, rate limiting, honeypot fields                          | You   |
| No one creates moments (organizers don't adopt) | High   | User testing with real organizers, pre-recruit pilot users                  | You   |
| RSVPs don't convert to check-ins                | High   | This is what we're testing—if it fails, pivot or kill                       | You   |
| Co-organizer abuse (bad actors delete moments)  | Medium | For MVP, accept the risk. Add roles/permissions in Next if it happens       | You   |
| Magic link phishing/account takeover            | Medium | Short token expiry (15min), single-use tokens, HTTPS only                   | You   |
| Geolocation/check-in feels creepy               | Medium | Make check-in manual/opt-in, clear privacy messaging                        | You   |
| Solo dev burnout                                | Medium | Ruthless scope discipline, celebrate small wins, timebox MVP to 10-12 weeks | You   |
| SMS delivery failures (carrier blocking)        | Medium | Use reputable SMS provider (Twilio), proper opt-in language                 | You   |
| Serverless cold starts hurt UX                  | Low    | Choose platform with good cold start times (Cloudflare Workers, Vercel)     | You   |

---

## Success Metrics for MVP

**When do we know the MVP worked?**

| Metric                                  | Target             | How to Measure                                   |
| --------------------------------------- | ------------------ | ------------------------------------------------ |
| Real moments created                    | ≥10                | Count of moments with ≥1 RSVP                    |
| Real participants                       | ≥50                | Count of unique phone numbers that RSVPd         |
| RSVP → Check-in conversion              | ≥60%               | Checked-in turnouts / Confirmed RSVPs            |
| Organizer return rate                   | ≥30%               | % of organizers who create 2nd moment in 30 days |
| Participants would recommend            | ≥70% "yes"         | Post-event survey (manual outreach for MVP)      |
| Time from moment creation to first RSVP | <24 hours (median) | Timestamp difference                             |

**If we hit these targets:** The concept is validated. Proceed to "Next" features and start thinking about growth.

**If we don't:** Figure out why. Is it the product, the audience, the messaging, or the core hypothesis?

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

---

## Assumptions to Validate

⚠️ **Tech stack assumption:** You're comfortable with web development (JS/TS, React/Vue/Svelte, serverless functions). If not, this timeline is fantasy.

⚠️ **User recruitment:** You have a plan to get 3-5 real organizers to pilot this. If you build it and no one comes, you'll learn nothing.

⚠️ **SMS is acceptable:** We're assuming participants are okay with SMS. If your audience skews toward privacy-conscious folks who won't give phone numbers, this approach fails.

⚠️ **Geolocation for check-in:** Assuming participants will allow location access. If not, manual check-in must be frictionless.

⚠️ **"Free forever" is sustainable:** With pay-as-you-go SMS and serverless hosting, MVP costs should be <$50/month for 10 moments, 50 participants, assuming moderate SMS volume (3 reminders/participant + auth messages). Validate this with real usage.

⚠️ **Phone-based identity is acceptable:** We're betting that phone-number-based magic link auth is "good enough" for MVP. No passwords, no email verification. If organizers feel this is too insecure for sensitive organizing, we'll need to add proper auth (email, 2FA, etc.).

---

## Next Steps

1. **Validate these assumptions with a human:** Show this roadmap to 2-3 potential organizers. Ask:
   - Would you use this?
   - What's missing that would block you?
   - What's here that you don't need?

2. **Pick your tech stack:** Choose your serverless platform, database, and SMS provider. Set up accounts.

3. **Build the MVP in phases:**
   - Week 1: Organizer auth (magic links)
   - Week 2-3: Moment creation + public pages
   - Week 4-5: RSVP + SMS verification
   - Week 6: Reminders + check-in
   - Week 7: Multi-moment dashboard + collaboration
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
