# turnout.network

**A platform for people who are done watching and ready to show up.**

Create a turnout. Share the link. People commit. Reminders land. They actually show up.

Right now, we're building the **core loop**: the infrastructure that makes showing up reliable. Create → share → commit → remind → check-in. The basics that most organizing tools get wrong.

The **long-term vision** is a trust network—where history matters, where you recognize who's steady, where organizing gets easier over time. But we're starting with the foundation: making it stupidly simple for people to actually follow through.

---

## What It Does (MVP)

**For first-time organizers:**
- Create a group and your first turnout in 2 minutes. Get a shareable link.
- Send it anywhere: group chats, Signal, email, Facebook. Just paste the link.
- See who's committed. Check them in when they arrive. Know who actually showed up.

**For participants:**
- One tap to RSVP. Phone verification (no password, no traditional signup).
- Smart reminders timed to help you follow through (not spam).
- One-tap check-in when you arrive. Simple as that.

**The core loop we're validating:**
Does making it stupidly simple to create, share, commit, and check-in actually increase follow-through? We think it does. That's what the MVP tests.

---

## Where It's Going (Vision)

Once the core loop works, we build the network effects:

- **Reputation emerges from action:** Your history of showing up becomes visible (if you choose). Organizers can see who's reliable based on what you've actually done, not what you claim.
- **Discovery:** Looking for another turnout? The network surfaces opportunities based on what you've shown up for before.
- **Trust becomes infrastructure:** Organizing gets easier over time because you're not starting from scratch—you know who's steady, they know you.

This is the long game. The one-year vision. Read [VISION.md](./context/VISION.md) for the full picture.

But we're not building that yet. We're building the foundation that makes it possible.

---

## Why It Matters

We live in a world that's very good at helping us *care* and very bad at helping us *act together*.

You can share an article in three seconds. You can start a group chat. You can post your outrage. But actually getting ten people to the same place at the same time to do something real? That's still unreasonably hard.

Turnout.network provides the missing logistics: commitment mechanisms, follow-through tools, and the infrastructure to track who actually shows up. We're starting with the basics—because if people don't reliably show up, nothing else matters.

**Read the full story:**
- [**VISION.md**](./context/VISION.md) — The aspirational future we're building toward
- [**INSPIRATION.md**](./context/INSPIRATION.md) — Why this matters (philosophically)
- [**ROADMAP.md**](./context/ROADMAP.md) — What we're building, when, and why

---

## Documentation

**Product & Design:**
- [Ubiquitous Language](./context/UL.md) — Core concepts and terminology
- [User Stories](./context/user-stories.md) — How people will actually use this
- [PRDs](./context/prd/) — Product requirements and user flows

**Technical:**
- [Architecture](./context/ARCHITECTURE.md) — Stack decisions, trade-offs, constraints
- [CLAUDE.md](./CLAUDE.md) — Instructions for AI assistants working on this project

---

## For Developers

**Planned stack:**
- Next.js 14+ (App Router), TypeScript
- Postgres (Neon for production, Docker Compose for local)
- Prisma ORM
- SST (Ion) on AWS (serverless hosting via Lambda@Edge + CloudFront)
- Twilio (SMS), Web Push API (notifications)
- AWS EventBridge (scheduled reminder jobs)

**Current status:** Greenfield. No code yet. Setup instructions will be added once there's something to set up.

**See [ARCHITECTURE.md](./context/ARCHITECTURE.md) for the reasoning behind these stack decisions.**

---

## Project Status

🚧 **Pre-MVP / Greenfield**

We're currently building the MVP core loop:
- Phone-based authentication
- Group and turnout creation
- Public turnout pages + RSVP
- SMS reminders + check-in system
- Group dashboard (multi-turnout view)
- Group-level collaboration (co-organizers)

Target: Validate with 10+ real-world turnouts, 50+ participants, ≥60% RSVP-to-check-in conversion.

See [ROADMAP.md](./context/ROADMAP.md) for full plan and success metrics.

---

## Philosophy

From [INSPIRATION.md](./context/INSPIRATION.md):

> "There is a particular, wretched kind of cowardice in watching the world burn from the comfort of your sofa. We have been sold the lie that our only power lies in a ballot box once every four years. Turnout is the antidote to that engineered helplessness."

We're not here to give you a hobby. We're here to give you a way to move together.

Showing up is the start of everything.
