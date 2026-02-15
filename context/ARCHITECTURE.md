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

### Database: Postgres (Neon) + Prisma

**What:** Postgres 16 (Docker Compose local, Neon serverless production). Prisma ORM for type-safe queries and schema-first migrations.

**Why:** Postgres is battle-tested and self-hostable. Neon's serverless tier is free for MVP and supports branch databases. Prisma gives us type safety and makes agent-written queries safe by default.

### Hosting: SST (Ion) on AWS

**What:** Infrastructure as Code via SST. Next.js deployed to Lambda@Edge + CloudFront. Full AWS access (EventBridge, SQS, S3, etc.).

**Why:**

- **Unlimited cron schedules:** Reminder system needs multiple EventBridge rules. Vercel Cron free tier = 1 job.
- **Infrastructure as Code:** Everything defined in code, not UI clicks. Easier to migrate than platform lock-in.
- **Reduced vendor lock-in:** Next.js app code is portable. Infrastructure code (SST → CDK/Terraform) is easier to migrate than Vercel. Moving AWS → GCP still requires infra rewrites and SDK changes, but app code survives.
- **Developer familiarity:** We already know SST. Vercel's "simplicity" advantage doesn't apply.

### Authentication: Phone-based OTP

**What:** SMS OTP codes (10-min expiry, single-use, 6 digits). WebOTP API for one-tap autofill. Persistent sessions (HttpOnly cookies, no expiration until logout).

**Why:** Sporadic usage patterns demand persistent sessions. Phone number is the weak point anyway, so "accessibility over hardened security" aligns with the Open Door Principle. OTP chosen over magic links for better SMS deliverability (no URLs = lower carrier spam scoring).

### Messaging: Twilio SMS + Web Push

**What:** Twilio for SMS (~$0.0079/msg). Web Push API for PWA notifications (free, browser-native).

**Why:** Hybrid strategy - prefer free PWA notifications, fallback to SMS when unavailable. Track which method works to optimize costs. SMS is the critical path for auth and reminders.

### Scheduled Jobs: AWS EventBridge

**What:** EventBridge rules trigger Lambda functions. Infrastructure as Code (defined in SST config).

**Why:** Need multiple cron schedules (check upcoming turnouts every 15 min, send reminders, cleanup tokens daily). No platform limits, no artificial tiers.

---

## Testing Strategy

**Philosophy:** Tests are executable acceptance criteria. Agent teams write and run tests to verify their work.

**What:**

- Integration tests for all Server Actions and cron handlers (Vitest + Docker Postgres)
- E2E tests for all user-facing flows (Playwright via MCP - agents run and debug)
- Unit tests for complex business logic only (as needed)

**Why:** Agents write comprehensive tests faster than humans, run them constantly via MCP, and debug failures autonomously. Tests are proof of completion and regression protection.

---

## Cost Estimate (MVP)

Expected usage: 10 turnouts, 50 participants, low traffic

- **AWS (Lambda, CloudFront, EventBridge):** ~$0-5 (free tier covers compute/networking)
- **Neon Postgres:** Free tier (0.5GB storage, sufficient)
- **Twilio SMS:** ~$2-20 (main cost driver)

**Total: ~$2-25/month**

At 1000 participants RSVPing (3 SMS each: auth + 2 reminders) = ~$24 in SMS alone.
