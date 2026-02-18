# ICEBOX

Things we've explicitly committed to building for MVP that don't yet have a TDD. Each needs a TDD before an agent team picks it up. These are cross-cutting infrastructure concerns — the main feature roadmap (group/turnout creation, RSVP, reminders, etc.) lives in [ROADMAP.md](./ROADMAP.md).

---

- **Observability setup** — Consider Sentry (error tracking), PostHog or Mixpanel (product analytics), CloudWatch alarms (cron job failures)? [ARCHITECTURE.md](./ARCHITECTURE.md) says every feature PR ships with this instrumentation — which means the scaffolding (DSNs, clients, alarm templates) needs to exist first. Should be a single setup TDD that all feature TDDs can reference.

- **10DLC A2P SMS registration** — Required for real-world SMS delivery to US & CA numbers. Without it, Twilio long-code SMS gets carrier-spam-filtered and the whole product breaks. One-time setup: $15 vetting fee + $0.50/month campaign. No EIN needed — register as Sole Proprietor (personal name, email, US address, sample messages). **⚠️ Manual vetting takes 2-3 weeks** — kick this off well before any real-user pilot, not after.

- **Ephemeral PR environments** — On PR open, deploy a per-branch SST stage + Neon branch DB, run Playwright E2E, tear it down on merge. Currently in [ROADMAP.md parking lot](./ROADMAP.md): "revisit after E2E suite is mature." Unlock this after TDD0001 E2E tests are stable.

- **Beginning i18n** - you know what, people in US+CA use languages other than english. consider at least adding spanish early so we can get our i18n patterns in place
