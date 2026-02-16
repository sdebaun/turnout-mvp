# turnout.network

**A platform for people who are done watching and ready to show up.**

Create a turnout. Share the link. People commit. Reminders land. They actually show up.

And then? That history matters. Every time you turn out, you build a visible track record.
Every person you show up with becomes part of your network. When you need people for
the next thing, you're not starting from scratch—you know who's reliable, and they know you.

This isn't an event platform. It's a trust network that turns "caring" into capacity.
The more you use it, the easier it gets to move together.

---

## What It Does

**For first-time organizers:**
- No experience required. Start with a planning meeting, build from there.
- Create a group and your first turnout in 2 minutes. Get a shareable link. Send it to your people.
- See who's committed. Know who showed up. Build on that next time.

**For participants:**
- One tap to commit. Just your phone number—no passwords, no profile setup.
- Smart reminders that actually help (not spam).
- Your history of showing up becomes visible proof you're reliable.

**For everyone:**
- The network learns who keeps their word.
- When you create your next turnout, it surfaces people who've shown up before.
- Trust becomes infrastructure. Organizing gets easier over time.

---

## Why It Matters

We live in a world that's very good at helping us *care* and very bad at helping us *act together*.

You can share an article in three seconds. You can start a group chat. You can post your outrage. But actually getting ten people to the same place at the same time to do something real? That's still unreasonably hard.

Turnout.network provides the missing logistics: commitment mechanisms, follow-through tools, and a trust layer that remembers who actually shows up. It's infrastructure for collective action—starting small, scaling as you need it.

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

From the vision doc:

> "There is a particular, wretched kind of cowardice in watching the world burn from the comfort of your sofa. We have been sold the lie that our only power lies in a ballot box once every four years. Turnout is the antidote to that engineered helplessness."

We're not here to give you a hobby. We're here to give you a way to move together.

Showing up is the start of everything.

---

**Questions? Ideas? Want to help?**
[Open an issue](../../issues) or reach out directly.
