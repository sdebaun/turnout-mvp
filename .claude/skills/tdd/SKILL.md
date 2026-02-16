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

PRDs describe **what** to build and **why**. Implementation needs specs that describe **how** to build it - what schema changes, what API routes, what components. Without a TDD, you make assumptions that may not align with product intent or architectural constraints.

## What You'll Need

**Critical inputs (ask if not provided):**

- Feature name and PRD reference (e.g., "prd0001")
- High-level requirements (what should the system do?)
- User flows (what actions trigger what behaviors?)
- Existing schema/code this feature touches

**Context you'll gather yourself:**

- `context/ARCHITECTURE.md` (stack constraints)
- `context/VISION.md` and `context/INSPIRATION.md` (philosophy)
- `context/ROADMAP.md` (where this fits in the plan)
- Existing Prisma schema (if database changes needed)
- Related TDDs (if this builds on previous work)

## Process

### Step 0: Check for Arguments

**If the user provided a PRD reference** (e.g., `/tdd prd0001`), you already know what to work on. Jump straight to Step 1 and read that PRD along with the other context files.

**If no PRD reference was provided**, ask:

> "Which PRD should I write a TDD for? I can see these PRDs in `context/prd/`:
> - prd0001: [name]
> - prd0002: [name]
>
> Or tell me the feature name and I'll find the relevant PRD."

### Step 1: Check Your Context

First, read the user's context files. most importantly:

- `context/INSPIRATION.md`
- `context/VISION.md`
- `context/ROADMAP.md`
- `context/ARCHITECTURE.md`

Next, see if a TDD already exists for this feature. If so, read it and use it as a starting point. If not, look for any related TDDs that might provide relevant context. TDD's can be found in and should live in `context/tdd`.

Also read any PRDs that the user has called out. If they invoked with `/tdd prd0001`, read `context/prd/prd0001-*.md`. If they didn't specify, look in `context/prd/` for one that matches the feature name or description.

**Tell the user what you found.** For example:

> "I read PRD0001 (Phone Identity System). This is an MVP feature from ROADMAP.md. The PRD defines magic-link phone auth with non-expiring sessions. Architecture constraint from ARCHITECTURE.md: we're using Next.js API routes and Prisma. I'll design the schema, API routes, and auth flow."

### Step 2: Gather Feature Details

If the user hasn't provided a PRD, ask:

> "I need to understand the feature before writing the spec:
>
> 1. What feature is this spec for? (I found [X] in product.md — is that it?)
> 2. What user actions should trigger this functionality?
> 3. Are there any existing systems this needs to integrate with?
>
> Or share the PRD if you have one."

### Step 2.5: Clarify Requirements

Think critically about the PRD. Along with the rest of the context you have, such as ARCHITECTURE and ROADMAP, does the PRD give you enough information to write a spec? If not, ask the user for more details. For example:

> "The PRD says 'users can create resource allocations' — but what does that look like? What fields do they need to provide? What validations should we have? Do we need to track who created it and when? The more details you can give me, the better the spec will be."

**Do NOT generate a spec with placeholder architecture. Get the requirements first.**

### Step 3: Identify Components

Figure out what parts of the system this touches:

- **Database:** New tables? Changes to existing schema?
- **API routes:** What Next.js API endpoints are needed?
- **Frontend:** New pages/components? Changes to existing ones?
- **Background jobs:** Any scheduled tasks (Vercel cron)?
- **Auth:** Who can access this? (Phone-based auth, simple rules)

### Step 4: Design the Database

Use Prisma schema syntax. Include:

- Model definitions (tables)
- Field types, defaults, constraints
- Relations (foreign keys)
- Indexes (if needed for performance)
- Migration considerations (safe to add? need data backfill?)

### Step 5: Design API Routes

For each Next.js API route, specify:

- Path and HTTP method
- Request shape (query params, body)
- Response shape (success and error cases)
- Auth requirements (who can call this?)
- Validation rules

### Step 6: Design Frontend Components

Identify:

- New pages/routes needed
- Components to create or modify
- User interactions and state management
- Form validation and error display

### Step 7: Handle Edge Cases

Think through:

- Error states and messages
- Validation rules
- What happens when things go wrong
- Migration safety (can this be deployed without breaking existing data?)

### Step 8: Write the TDD

Create the TDD file at `context/tdd/tdd[NUMBER]-[slug].md`, where:
- `[NUMBER]` matches the PRD number (e.g., if working from prd0001, use tdd0001)
- `[slug]` is a kebab-case description (e.g., `phone-identity`, `group-creation`)

Example: For PRD0001 (Phone Identity), create `context/tdd/tdd0001-phone-identity.md`

## Output Template

```markdown
# TDD: [Feature Name]

**PRD:** [prd000X reference]
**Status:** Draft | Ready for Implementation
**Last Updated:** [Date]

## Context

_What I found:_

- **Vision alignment:** [How this connects to VISION.md]
- **Roadmap phase:** [MVP/Next/Later from ROADMAP.md]
- **Architecture constraints:** [Key constraints from ARCHITECTURE.md]

---

## Overview

**Problem:** [One sentence from PRD]
**Solution:** [One sentence - how we'll build it]
**Scope:** [What's in vs out]

---

## Components

**What this touches:**

- [ ] Database (Prisma schema changes)
- [ ] API routes (Next.js `/app/api/*`)
- [ ] Frontend (pages/components)
- [ ] Background jobs (Vercel cron)
- [ ] Auth/permissions

---

## Database Schema

### Prisma Models

```prisma
// Example - replace with actual schema

model Example {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  userId    String
  user      User     @relation(fields: [userId], references: [id])

  // Indexes
  @@index([userId])
}
```

### Changes to Existing Models

_If modifying existing schema:_

| Model | Change | Reason | Safe? |
|-------|--------|--------|-------|
| [Model] | [add field / change type] | [why] | [yes/no - migration plan] |

### Migration Notes

_If this needs data migration or has breaking changes:_

- [ ] Safe to deploy without breaking existing data?
- [ ] Need to backfill data?
- [ ] Can roll back safely?

---

## API Routes

### Next.js API Endpoints

#### Example Route: `POST /api/example`

**File:** `app/api/example/route.ts`

**Request:**
```typescript
{
  field: string
  optionalField?: number
}
```

**Response (success):**
```typescript
{
  id: string
  field: string
  createdAt: string
}
```

**Response (error):**
```typescript
{
  error: string
  details?: string
}
```

**Auth:** Phone-verified user required (check session cookie)

**Validation:**
- `field` required, max 100 chars
- `optionalField` if provided, must be > 0

**Errors:**
- `400`: Validation failed
- `401`: Not authenticated
- `403`: Not authorized (if applicable)
- `409`: Conflict (duplicate, etc.)

---

## Frontend Components

### Pages/Routes

_What pages or routes need to be added or modified:_

| Route | Component | Purpose | Auth Required |
|-------|-----------|---------|---------------|
| `/example` | `ExamplePage` | [Description] | Yes/No |

### Components

_What React components need to be created or modified:_

- **`ComponentName`** - [Purpose and key props]
- **`AnotherComponent`** - [Purpose and key props]

### User Interactions

_Key user flows and interactions:_

1. User does X
2. System validates Y
3. System shows Z
4. User confirms/cancels

---

## Auth & Permissions

**Who can access this feature?**

- Phone-verified users only (check session)
- Public (no auth required)
- Organizers only (check ownership)
- Specific conditions: [describe]

**Access rules:**

- User can view their own [resource]
- Organizer can manage their group's [resources]
- Public turnout pages are accessible to anyone

---

## Edge Cases & Error Handling

**What could go wrong?**

| Scenario | Expected Behavior | Error Message |
|----------|------------------|---------------|
| [Bad input] | Return 400 | "[User-friendly message]" |
| [Not found] | Return 404 | "[User-friendly message]" |
| [Permission denied] | Return 403 | "[User-friendly message]" |
| [Conflict] | Return 409 | "[User-friendly message]" |

**Validation rules:**

- [ ] [Field] must be [constraint]
- [ ] [Field] must be [constraint]

---

## Background Jobs

_If this needs scheduled tasks (Vercel cron):_

**Job:** [Job name]
- **Schedule:** [cron expression or description]
- **Purpose:** [What it does]
- **Implementation:** [Which file/function]

_Example: "Send SMS reminders for turnouts happening in 24 hours"_

---

## Open Questions

_Things that need clarification before implementation:_

- [ ] [Question] - [Why this matters]
- [ ] [Question] - [Why this matters]

---

## Related Context

- **PRD:** [prd000X reference]
- **Roadmap Phase:** [MVP/Next/Later]
- **Related TDDs:** [Other TDDs this depends on or relates to]
```

---

## Key Principles

When writing TDDs for turnout.network MVP:

1. **Serverless constraints** - Design for Vercel (no long-running processes, cold starts matter)
2. **Simple auth** - Phone-based magic links, no complex RBAC yet
3. **Prisma-first** - Schema is source of truth, migrations should be safe
4. **Edge cases matter** - Think through what breaks, not just happy path
5. **Handoff-ready** - Agent team should be able to implement from this doc alone

## Tips for Best Results

1. **Read the context files first** - ARCHITECTURE.md, VISION.md, ROADMAP.md, and the PRD
2. **Ask questions** - If the PRD is vague, clarify before designing
3. **Think about migration** - Can this deploy without breaking existing data?
4. **Keep it lean** - This is MVP, not enterprise SaaS. Simple > clever.
