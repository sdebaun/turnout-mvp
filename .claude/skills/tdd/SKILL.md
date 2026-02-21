---
name: tdd
description: "Write a tdd (technical design document) documenting key implementation details that are sufficient to guide a human engineer or AI assistant in development. Use when: write tdd, work on tdd, edit tdd, make tdd, technical spec, tech spec, engineering spec."
---

# TDD Writer

Write technical design docs to guide an implementer. Use this skill when you have a clear feature definition and need to design the system to implement it.

## When to Use This Skill

- After PRD is drafted, before implementation starts
- When you need to design how a feature will actually work
- Before handing off to an agent team to build the feature

## The Problem

PRDs describe **what** to build and **why**. TDDs describe **how** to build it — what schema, what Server Actions, what library functions, what components, what tests. Without a TDD, the dev team makes assumptions that may not align with product intent or architectural constraints.

## What You'll Need

**Critical inputs (ask if not provided):**

- Feature name and PRD reference (e.g., "prd0002")
- High-level requirements (what should the system do?)
- User flows (what actions trigger what behaviors?)

---

## Rules

These are non-negotiable. Violating them wastes the dev team's context window and leads to wrong implementations.

1. **Spec behavior, not code.** Do not write TypeScript function bodies, JSX, or full object blobs. Three exceptions that ARE the spec: Prisma schema blocks, function signatures (`name(param: type): ReturnType`), named error types (`{ code: 'RATE_LIMITED_MINUTE' }`). Everything else is prose.
2. **Access pattern driven.** For user-facing features, design outside-in: UI first, then actions, then schema. Schema serves the user, not the other way around.
3. **Design for testability throughout.** Library functions must have injectable dependencies and no hidden state. Components must have enumerable render states. Errors must have specific codes. Untestable design can't be fixed at the testing step.
4. **Server Actions + library layer — never conflate them.** Actions orchestrate, libraries compute. No business logic in Server Actions. No Next.js concerns in library functions.
5. **Tests are enumerated, not gestured at.** "Test the happy path" is useless. List the specific cases the dev team should write.
6. **Parallelization is explicit.** Tell the dev team what they can do simultaneously. A good TDD unlocks parallel work; a vague one forces serial execution.
7. **Prerequisites gate everything.** If the dev team can't start, say so clearly and say exactly why.
8. **Handoff-ready.** The dev team should be able to implement from this doc alone without asking questions.

---

## Process

### Step 1: Orient

**Identify the PRD.** If the user provided a reference (e.g., `/tdd prd0002`), use it. If not, list what's in `context/prd/` and ask which one to spec. Don't guess.

**Read all of these before designing anything:**

- `context/INSPIRATION.md`, `context/VISION.md`, `context/ROADMAP.md`, `context/ARCHITECTURE.md`
- The PRD being specced
- Any related TDDs in `context/tdd/` (especially the immediately preceding one — this TDD probably builds on its primitives)
- Existing Prisma schema at `lib/db/schema.prisma`

**Tell the user what you found** — roadmap phase, dependencies on prior TDDs, external services required, what you're about to spec:

> "I read PRD0002 (Group & Turnout Creation). MVP Week 2-3, depends on TDD0001's auth primitives (AuthModal, Server Actions, getUser). Google Places API required for location. I'll spec the schema, Server Actions, library layer, components, and testing strategy."

**Clarify before designing.** If the PRD is vague on anything that changes the schema or architecture, ask now and wait for an answer. Do not write a TDD with open questions — a spec full of holes is worse than no spec. The TDD does not get written until the questions are resolved.

### Step 2: Map the Feature

Before designing anything, identify what this feature touches:

- **Frontend:** New pages/routes? New components? Modified components?
- **Server Actions:** What actions does the UI trigger?
- **Library layer:** What business logic functions do those actions call?
- **Database:** New tables? Changes to existing schema?
- **Background jobs:** Any scheduled tasks? (SST Cron → Lambda)
- **External services:** Third-party APIs? Webhooks? New SST secrets?
- **Auth:** Who can do this? (session check, ownership check, public)

### Step 3: Check Prerequisites

Before the dev team writes a single line, what must already be true? Distinguish between two kinds of blockers:

**Human tasks** — things a human must do that an agent cannot. Flag these explicitly, especially if they have lead times:

- Account creation, service registration, approval processes
- SST secret configuration (agent can verify they exist, not create credentials)
- Manual vetting with long waits (e.g., 10DLC registration = 2-3 weeks)

**Code dependencies** — prior TDDs that must be complete, and what specifically they provide.

If any human task has a multi-week lead time, say so loudly. The human should kick it off before implementation starts, not after.

### Step 4: Design Frontend Components

_If this feature has no user-facing changes (pure background job, migration, etc.), skip to Step 5._

Start here for user-facing features. The schema should serve the UI, not the other way around.

For each page or component:

- Purpose and where it sits in the page hierarchy
- What state it owns
- What Server Actions it calls
- What it renders in each state: loading, error, empty, populated
- User interactions and what triggers them

No JSX. No styling directives. Describe behavior, not implementation.

For each user interaction flow, enumerate E2E test scenarios inline — what the user does and what should happen in the browser. See ARCHITECTURE.md for Tier 2/3 definitions.

### Step 5: Design Server Actions and Library Layer

With the UI flows established, design what powers them.

**Server Actions** (`app/[feature]/actions.ts`) — thin orchestrators only. For each:

- Name and input parameters (types in prose)
- Step-by-step what it does: validate → call lib function → handle error → return
- Return shape: success case and error case in prose
- Explicit note on what it does NOT do (no direct DB calls, no business logic)
- Enumerate specific Tier 1 test cases inline

**Library functions** (`lib/[feature]/[module].ts`) — the actual business logic. For each:

- Name, inputs, return type — `ResultAsync<T, E>` for fallible operations (see ARCHITECTURE.md)
- Named error types with specific codes (e.g., `{ code: 'RATE_LIMITED_MINUTE' }`) — the dev team needs to know what errors exist, not just that errors can happen
- Step-by-step behavior in plain English
- What it doesn't know about: no cookies, no Next.js, no redirects
- Enumerate specific Tier 1 test cases inline
- If the function calls an external service, specify the CI bypass mechanism (what it skips, what still runs, that it must never be set in production)

Only add a Webhooks & External Integrations section if an external system needs to call in (Twilio delivery status, payment callbacks, etc.). Most features don't need this.

### Step 6: Design the Database

With the access patterns established, design the schema that supports them. Prisma schema blocks are the spec — write them fully and correctly. For each model:

- Every field with type, default, and constraints
- All relations with cascade behavior explicitly stated
- Indexes with a comment explaining why each exists
- Invariants worth calling out (e.g., "User and Credential are always created together — never independently")

For changes to existing models, explain migration safety: can this deploy without downtime? Need backfill? Destructive?

### Step 7: Define Implementation Order

Tell the dev team explicitly what can be parallelized and what can't. Don't make them guess — wrong sequencing wastes time and creates blockers.

What has hard dependencies:

- Schema migration before Server Actions that query it
- Server Actions before components that call them (usually — stubs can be written earlier)

What can be done in parallel:

- Schema migration and component stubs often can
- Multiple independent library modules usually can
- Tests can often be written alongside implementation

Write a concrete sequence and call out the parallelizable chunks explicitly. Then write the TDD to `context/tdd/tdd[NUMBER]-[slug].md`, where `[NUMBER]` matches the PRD number.

---

## Output Template

```markdown
# TDD: [Feature Name]

**PRD:** [prd000X reference]
**Status:** Ready for Implementation
**Last Updated:** [Date]

**Optional sections included:** _(Testing is inline per artifact — see ARCHITECTURE.md for tier definitions)_

- [ ] Frontend Components
- [ ] Server Actions
- [ ] Library Layer
- [ ] Webhooks & External Integrations
- [ ] Database Schema
- [ ] Background Jobs
- [ ] Edge Cases & Error Handling

---

## Context

- **Vision alignment:** [How this connects to VISION.md]
- **Roadmap phase:** [MVP/Next/Later from ROADMAP.md]
- **Key PRD decisions carried forward:** [Anything from the PRD that directly shapes implementation choices]

---

## Overview

**Problem:** [One sentence from PRD]
**Solution:** [One sentence — how we'll build it]
**What this TDD builds:** [Specific artifacts: which lib files, which actions, which components, which pages]
**How downstream TDDs use this:** [What primitives or patterns does this expose? If none, omit.]

**The [feature] flow:** _(Omit if there's no meaningful core loop to summarize.)_

1. [Step]
2. [Step]

**Scope:**

- ✅ [In scope]
- ❌ [Explicitly out of scope]

---

## Prerequisites

**Human tasks** _(things a human must do; flag lead times)_:

- ✅/❌ [Setup task] — [how to verify]
- ⚠️ [Long-lead task] — **start now, takes [N] weeks**

**Code dependencies:**

- ✅/❌ [Prior TDD] — provides [what specifically]

**SST secrets:**

- ✅/❌ [SecretName] — `sst secret list --stage [stage]`

**Status:** ✅ Ready to implement. / ❌ Blocked on [what].

**NPM Dependencies:** _(Omit if none)_
`pnpm add [package]` — [why needed]

---

## Auth & Permissions

[Who can do what. Specific and brief.]

---

## Frontend Components

### Pages / Routes

| Route   | Component       | Auth required | Purpose        |
| ------- | --------------- | ------------- | -------------- |
| `/path` | `ComponentName` | Yes/No        | [What it does] |

### Components

**`ComponentName`**

- State: [what it owns]
- Calls: [which Server Actions]
- Renders: [loading / error / empty / success states]

### User Interactions

**Flow 1: [Name]**

1. [Action] → [what happens]
2. [Result]

**E2E:** [what user does in browser → what should happen]

**Flow 2: [Name — include error/edge-case flows, not just happy path]**

1. ...

**E2E:** [scenario]

---

## Server Actions

_`app/[feature]/actions.ts` — validate input, call lib functions, handle errors, set cookies. No business logic._

### `actionName(param)`

**Input:** [prose] **Returns:** `{ success: true }` or `{ error: string }`

1. Validate [what] → `{ error }` if invalid
2. Call `libFn(...)` → `{ error }` on failure
3. Return `{ success: true }`

**Tests:** [specific case: input → expected output]

---

## Library Layer

_`lib/[feature]/` — no Next.js concerns. Each function independently testable._

### `lib/[feature]/[module].ts`

`type [ModuleError] = { code: 'X' } | { code: 'Y' }` _(if shared across functions)_

**`functionName(param)`** → `ResultAsync<T, ModuleError>`
[What it does, step by step]

- `{ code: 'X' }` — [when]

**Tests:** `functionName([input])` → `ok([expected])`; `functionName([invalid])` → `err({ code: 'X' })`

**CI Bypass:** _(if calls external service)_ `[ENV_VAR]=true` — skips [what], returns [hardcoded]. Must never be set in production.

---

## Webhooks & External Integrations

_Only if an external system calls INTO this app. Not for UI-triggered flows._

---

## Database Schema

### New Models

[Full Prisma schema — this is the spec, write it completely]

### Changes to Existing Models

| Model | Field | Change | Migration safe? |
| ----- | ----- | ------ | --------------- |

### Migration Notes

[Anything destructive or requiring backfill. Flag it loudly.]

---

## Background Jobs

**Job: [Name]**

- Handler: `apps/functions/src/[filename].ts`
- Schedule: [rate or cron]
- Links: [SST secrets/resources]
- Alarm: [CloudWatch alarm — trigger condition, notification target]
- Canary: [what it verifies end-to-end, how often, what alarm fires on failure]

---

## Edge Cases & Error Handling

| Scenario          | Expected behavior  | User-facing message |
| ----------------- | ------------------ | ------------------- |
| [what goes wrong] | [what system does] | "[message]"         |

**Validation rules:** [field] must [constraint]

---

## Implementation Order

**Hard dependencies:**

1. [What blocks everything else and why]
2. [What that unlocks]

**Can be parallelized:**

- [Task A] and [Task B] once [dependency] is done

---

## Decisions Made

- **[Decision]:** [What was decided and why. Dev team does not relitigate these.]

---

## Success Criteria

- ✅ [Specific, verifiable thing]
- ✅ All Tier 1 tests pass
- ✅ All Tier 3 CI E2E tests pass
- ✅ Deployed to dev stage and verified end-to-end
```
