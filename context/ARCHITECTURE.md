# Technical Architecture

**Last updated: 2026-02-14**

## Stack Decisions

### Frontend + Backend
**Next.js 14+ (App Router)**
- React-based, TypeScript throughout
- API routes = serverless functions
- SSR for public moment pages (social sharing)
- Built-in PWA support

### Database
**Postgres via Neon (production) + Docker Compose (local)**
- **Local dev:** Docker Compose + Postgres 16 (fast iteration, offline capable)
- **Production:** Neon (serverless Postgres, free tier, branch databases)
- **ORM:** Prisma (type-safe, schema-first, works with any Postgres)

### Hosting
**Vercel**
- Serverless functions (API routes)
- Branch deployments (every PR gets preview URL)
- Zero-config Next.js deployment
- Free tier sufficient for MVP

**Exit strategy:** Next.js is portable (can deploy to AWS/SST, self-hosted, Docker, etc.)

### Authentication
**Phone-based magic links** (no passwords)
- SMS magic links for initial auth (15-min expiry, single-use)
- Persistent sessions (cookies don't expire, only on explicit logout)
- HTTPS only, HttpOnly, SameSite=Lax, Secure flag
- Rationale: Sporadic usage patterns, phone number is the weak point anyway, accessibility over hardened security

### Messaging
**SMS:** Twilio (pay-as-you-go, ~$0.0079/SMS)
**Push:** Web Push API (free, standards-based, built into browsers)

**Reminder strategy:** Hybrid
- Prefer PWA notifications (free)
- Fallback to SMS when PWA unavailable
- Track which method used, measure effectiveness

### Scheduled Jobs
**Vercel Cron** (MVP)
- Built-in cron jobs (check for upcoming moments every 15min, send reminders)
- Free tier: 1 cron job

**Exit strategy:** Replace with AWS EventBridge or server-based cron when self-hosting

## Key Constraints

- **TypeScript everywhere** (non-negotiable)
- **Self-hostable** (avoid hard vendor lock-in)
- **Branch deployments** (PR previews for testing)
- **Free tier viable** (MVP should cost <$50/month, mostly SMS)

## Cost Estimate (MVP)

- **Vercel:** Free tier (unlimited deploys, 100GB bandwidth)
- **Neon:** Free tier (0.5GB storage, sufficient for thousands of moments)
- **Twilio:** ~$2-20 (SMS only, scales with usage)

**Total: ~$2-20/month**
