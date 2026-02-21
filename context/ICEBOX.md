# ICEBOX

Things we've explicitly committed to building for MVP that don't yet have a TDD. Each needs a TDD before an agent team picks it up. These are cross-cutting infrastructure concerns — the main feature roadmap (group/turnout creation, RSVP, reminders, etc.) lives in [ROADMAP.md](./ROADMAP.md).

---

- **Observability setup** — Consider Sentry (error tracking), PostHog or Mixpanel (product analytics), CloudWatch alarms (cron job failures)? [ARCHITECTURE.md](./ARCHITECTURE.md) says every feature PR ships with this instrumentation — which means the scaffolding (DSNs, clients, alarm templates) needs to exist first. Should be a single setup TDD that all feature TDDs can reference.

- **10DLC A2P SMS registration** — Required for real-world SMS delivery to US & CA numbers. Without it, Twilio long-code SMS gets carrier-spam-filtered and the whole product breaks. One-time setup: $15 vetting fee + $0.50/month campaign. No EIN needed — register as Sole Proprietor (personal name, email, US address, sample messages). **⚠️ Manual vetting takes 2-3 weeks** — kick this off well before any real-user pilot, not after.

- **Ephemeral PR environments** — On PR open, deploy a per-branch SST stage + Neon branch DB, run Playwright E2E, tear it down on merge. Currently in [ROADMAP.md parking lot](./ROADMAP.md): "revisit after E2E suite is mature." Unlock this after TDD0001 E2E tests are stable.

- **Beginning i18n** - you know what, people in US+CA use languages other than english. consider at least adding spanish early so we can get our i18n patterns in place

- **Prisma generate in dev workflow** — IDE redlines on `@prisma/client` imports are a recurring annoyance because the generated client (`node_modules/.prisma/client`) is missing or stale. The `postinstall` hook runs `prisma generate` after `pnpm install`, but that doesn't help when the schema changes mid-session without a reinstall. Need a solution that keeps the generated types in sync during active development — options include a file watcher (`prisma generate --watch`), a VS Code task, or a `pnpm dev` script that runs generate before starting the dev server. Should also ensure `prisma generate` is explicitly called in CI before typecheck/build steps in case the postinstall hook doesn't fire.

- **Desktop share UX** — The Web Share button is currently hidden on desktop (`navigator.maxTouchPoints === 0`) because it triggers an unfamiliar macOS/Windows native share sheet. Desktop users get "Copy Invite" and "Copy Link" which are good enough for now. Eventually we want a proper desktop share experience — maybe a dropdown with direct options (copy, email, tweet, etc.) or a share modal. Needs UX thought before building.

- bugfix: currently, entering a phone number is crappy in the ux. chrome is autocompleting my "+1234567890" phone number. but when i select that autocomplete the field drops the "+". and then form validation eats it. is there a better 3p component we can put in there?
