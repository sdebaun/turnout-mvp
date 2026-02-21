# Technical Architecture

**Last updated: 2026-02-14**

**Scope:** This document defines **what** we're using and **why**. Implementation details (commands, setup, code) belong in DEVELOPMENT.md, README.md, or TDDs.

## Key Constraints

- **TypeScript everywhere** (non-negotiable - enables agent teams to write type-safe code)
- **Infrastructure as Code** (reduce vendor lock-in, everything in `sst.config.ts`)
- **Low cost viable** (target <$50/month for MVP, mostly SMS costs)

## Stack Decisions

### Application: Next.js 14+ (App Router) + Server-First Pattern

**What:** React-based app using Server Components and Server Actions as the default. API routes only for external integrations (webhooks, OTP validation). SSR for public pages. TypeScript throughout.

**Why:** Server Components + Server Actions eliminate the artificial client/server split. Less boilerplate, end-to-end type safety, progressive enhancement. We're building a server-rendered app, not a SPA with a separate API. This maximizes leverage for agent teams - they build features, not infrastructure.

**When to use API routes:** Only when external systems call you (Twilio webhooks) or non-browser clients need access. Cron jobs trigger Lambda functions directly (no API route needed).

**Two-layer backend architecture:** Server Actions (`app/*/actions.ts`) are thin orchestrators — validate input, call library functions, handle errors, set cookies. Business logic lives in library functions (`lib/*/`) — independently testable, no Next.js concerns (no cookies, no redirects). Never put business logic in a Server Action. Never put Next.js concerns in a library function.

**Error handling:** Library functions use `ResultAsync<T, E>` from [neverthrow](https://github.com/supermacro/neverthrow) for all fallible operations. Errors are typed objects with a `code` field (e.g., `{ code: 'RATE_LIMITED_MINUTE' }`), never raw strings or thrown exceptions. Server Actions unwrap these results and map them to user-facing error messages.

### Database: Postgres (Neon) + Prisma

**What:** Postgres 16 (Docker Compose local, Neon serverless production). Prisma ORM for type-safe queries and schema-first migrations.

**Why:** Postgres is battle-tested and self-hostable. Neon's serverless tier is free for MVP and supports branch databases. Prisma gives us type safety and makes agent-written queries safe by default.

### Hosting: SST (Ion) on AWS

**What:** Infrastructure as Code via SST v3 (Ion). Next.js deployed to Lambda@Edge + CloudFront. Full AWS access (EventBridge, SQS, S3, etc.).

**Why SST + AWS (not Vercel):**

This is a deliberate, informed choice. Common objections addressed:

**"But Vercel is simpler!"**
- True for developers learning the stack. Not true for us—we're already comfortable with SST.
- Vercel's simplicity is UI-driven configuration. We prefer Infrastructure as Code (everything in `sst.config.ts`).
- For agent teams, SST's code-based config is easier to work with than Vercel's dashboard + environment variables.

**"But you'll outgrow Vercel anyway!"**
- Correct. We expect to need:
  - Multiple EventBridge cron schedules (Vercel Cron free tier = 1 job, Pro = limited)
  - SQS for async job processing (reminder sending, check-in notifications)
  - S3 for future file uploads (user avatars, group logos)
  - Direct database connections from Lambda (Neon's serverless Postgres works better with Lambda than Vercel's edge runtime)
- Starting with AWS now means no migration later.

**"But per-branch previews!"**
- SST supports full-stack per-branch deployments: Lambda functions, EventBridge rules, databases (Neon branches), environment variables—everything.
- Vercel only deploys the Next.js app. Previews don't include cron jobs or AWS resources.
- For testing reminder flows, you NEED the full stack in preview environments.

**"But Lambda@Edge cold starts!"**
- Real concern for sub-second latency requirements. We're provisioning concurrency from day one.
- **Provisioned Concurrency:** 1 Lambda instance always hot (~$11/month). Eliminates cold starts for typical traffic.
- Alice clicks a link on a street corner—instant page load matters. $11/month is cheaper than losing her attention.
- At MVP scale (10 turnouts, 50 participants), 1 provisioned instance covers normal load. Lambda auto-scales beyond that.

**"But debugging is harder!"**
- Debugging Lambda is harder than debugging Vercel. True.
- We're comfortable with CloudWatch Logs, Lambda insights, and SST's `sst dev` local mode.
- Tradeoff accepted for infrastructure control.

**Bottom line:** SST + AWS is the right choice for this project. If you're an agent reading this and thinking "but Vercel would be simpler," understand that the decision has been made based on team familiarity, expected growth, and architectural needs. Don't relitigate it.

### Authentication: Phone-based OTP

**What:** SMS OTP codes (10-min expiry, single-use, 6 digits). WebOTP API for one-tap autofill. Database-backed persistent sessions (HttpOnly cookies, no expiration until logout).

**Why:** Sporadic usage patterns demand persistent sessions. Phone number is the weak point anyway, so "accessibility over hardened security" aligns with the Open Door Principle. OTP chosen over magic links for better SMS deliverability (no URLs = lower carrier spam scoring).

**Session Management:**
- **Storage:** Database-backed. Cookie contains session ID, database stores phone number + created_at + expires_at (null for persistent).
- **Cross-device:** Each device requires separate OTP flow. Same phone number can have multiple active sessions (phone + laptop + tablet).
- **Invalidation:** Logout deletes session from database. Cookie is HttpOnly, Secure, SameSite=Lax.
- **Phone number change:** Out of scope for MVP. If needed later, would invalidate all sessions for old number.

### Messaging: Twilio SMS + Web Push

**What:** Twilio for SMS (~$0.0079/msg). Web Push API for PWA notifications (free, browser-native).

**Why:** Hybrid strategy - prefer free PWA notifications, fallback to SMS when unavailable. Track which method works to optimize costs. SMS is the critical path for auth and reminders.

### Scheduled Jobs: AWS EventBridge

**What:** EventBridge rules trigger Lambda functions. Infrastructure as Code (defined in SST config).

**Why:** Need multiple cron schedules (check upcoming turnouts every 15 min, send reminders, cleanup tokens daily). No platform limits, no artificial tiers.

---

## Testing Strategy

**Philosophy:** Tests are executable acceptance criteria. Agent teams write and run tests to verify their work. Not every feature needs all four tiers — include what's appropriate.

**Tier 1 — Unit/Integration (Vitest):** Mock external services. Use the real dev Neon database — truncate relevant tables in `beforeEach` (FK order matters). Test library functions and Server Actions directly. List specific cases: not "test the happy path" but "`createSession` returns `ok(token)` where token is 64 hex chars."

**Tier 2 — E2E Dev Stage (Playwright):** Real external services. Browser-level testing of user flows. Requires test infrastructure (dedicated test accounts, helper utilities, seeded data). Agents run and debug via MCP.

**Tier 3 — E2E CI (Playwright with bypass):** No external service credentials in CI. Each feature that uses external services implements a bypass mechanism (e.g. `TEST_OTP_BYPASS=true`) that short-circuits the external call while leaving all DB logic intact. Document exactly what the bypass skips and that it must never be set in production.

**Tier 4 — Production Canary (Lambda cron):** Only for features with external dependencies that could fail silently (SMS delivery, payment processing, etc.). A scheduled Lambda sends a real request through the full stack and alarms via CloudWatch if it fails. Defined in `sst.config.ts` alongside the feature.

---

## Observability Strategy

**Philosophy:** Observability is a feature requirement, not ops infrastructure. Every PR ships with its own monitoring.

### What Agents Ship With Every Feature

**1. Product Analytics (Mixpanel or PostHog)**
- Track key events: `mixpanel.track('Turnout Created', { groupId, userId })`
- Document what's tracked in PRD/TDD
- Provide SQL query or dashboard config for metrics

**2. Error Tracking (Sentry)**
- Add error context: `Sentry.setContext('turnout', { id: turnoutId })`
- Try/catch blocks for critical paths with descriptive errors
- Automatic exception capture for unhandled errors

**3. Critical Path Alarms (CloudWatch + SNS)**
- For cron jobs: Define alarm in `sst.config.ts` that emails on failure
- For external APIs: Add retry logic + alarm if retries exhausted
- Document: "If X fails, you'll get an email about Y"

**4. Metrics Queries (SQL Views)**
- Write Prisma migrations that create views: `CREATE VIEW daily_rsvps AS...`
- Or provide ad-hoc queries for dashboard tools

### Tools & Services

**Sentry** (Free tier: 5k events/month)
- Exception tracking with stack traces
- Real-time alerts when code breaks
- One-line Next.js integration

**Mixpanel or PostHog** (Free tier: 20M events/month)
- Product analytics and dashboards
- Real-time activity monitoring
- Alternative: Just query Postgres directly

**CloudWatch Alarms** (~$0.10/alarm/month)
- Defined in SST (Infrastructure as Code)
- SNS email notifications when jobs fail
- Agents define alarms alongside features

### Human Setup Required (One-Time, ~15 min)

1. Sign up for Sentry → paste DSN into `.env`
2. Sign up for Mixpanel/PostHog → paste API key into `.env`
3. Click "Confirm Subscription" in SNS email when first alarm deploys
4. (Optional) Deploy dashboard tool if you want graphs beyond Mixpanel

**Daily routine:** Check one dashboard showing turnouts/RSVPs/check-ins/errors. Takes 2 minutes.

### What We're NOT Doing (MVP)

- ❌ Structured logging (CloudWatch Logs is sufficient)
- ❌ Distributed tracing (single monolith, not needed)
- ❌ Uptime monitoring (you'll know if it's down)
- ❌ Performance monitoring (optimize after users exist)

---

## Cost Estimate (MVP)

Expected usage: 10 turnouts, 50 participants, low traffic

- **AWS Lambda (provisioned concurrency):** ~$11/month (1 instance always hot)
- **AWS (CloudFront, EventBridge, execution):** ~$0-5 (free tier covers most usage)
- **Neon Postgres:** Free tier (0.5GB storage, sufficient)
- **Twilio phone number:** ~$1.15/month (required for SMS)
- **Twilio 10DLC registration:** $15 one-time + $0.50/month campaign fee
- **Twilio SMS:** ~$5-15/month (50 participants × ~3 SMS each: auth + reminders)

**Total recurring: ~$18-33/month**
**Total first month (with 10DLC setup): ~$33-48**

At 1000 participants RSVPing (1000 auth + 300 re-auth + 3000 reminders = 4300 SMS):
- SMS costs: ~$34
- Infrastructure: ~$17
- **Total at scale: ~$51/month**
