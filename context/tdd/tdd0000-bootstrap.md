# TDD0000: Project Bootstrap

**PRD:** N/A (Infrastructure - precedes all PRDs)
**Status:** Draft
**Last Updated:** 2026-02-14

## Context

**What I found:**

- **Vision alignment:** This is the foundational infrastructure that enables all MVP features. Without this, nothing else can be built.
- **Roadmap phase:** Pre-MVP (blocking all MVP work from ROADMAP.md)
- **Architecture constraints from ARCHITECTURE.md:**
  - TypeScript everywhere
  - Next.js 14+ (App Router) + Server-First Pattern
  - Postgres (Neon) + Prisma
  - SST (Ion) on AWS
  - Infrastructure as Code
  - Testing: Vitest (integration) + Playwright (E2E)

---

## Overview

**Problem:** We have a greenfield project with no code. Before agent teams can implement MVP features (phone auth, turnout creation, etc.), we need working infrastructure at "hello world" level.

**Solution:** Bootstrap a monorepo with Next.js app, Lambda functions, shared database layer, and testing infrastructure. Everything deploys to AWS via SST and passes CI.

**Scope:**

**In scope:**
- Project structure (monorepo with pnpm workspaces)
- Next.js app with hello-world page and Server Action
- Lambda function with hello-world cron handler
- Prisma with minimal schema + local Docker Postgres
- SST config that deploys to AWS dev stage
- Testing infrastructure (Vitest + Playwright with smoke tests)
- GitHub Actions CI that runs tests on PR

**Out of scope:**
- Any real features (auth, turnouts, etc. - those come later)
- Production deployment (dev stage only for now)
- Complex database schema (just enough to prove Prisma works)
- Advanced SST configuration (secrets, custom domains, etc.)

---

## Success Criteria

After this TDD is implemented, an agent team should be able to:

1. Clone the repo and run `pnpm install`
2. Run `pnpm dev` and see a Next.js app at http://localhost:3000
3. Run `pnpm test` and see all tests pass
4. Run `pnpm deploy` and deploy to AWS dev stage
5. Verify deployment succeeded programmatically (exit code 0, curl returns 200)
6. Start implementing prd0001 (phone identity) without touching infrastructure

---

## Prerequisites

**⚠️ HUMAN REQUIRED (unless MCP servers available):**

The following setup steps require external services and cannot be completed autonomously by agents without MCP server support.

### MCP Servers That Could Help

**Recommended MCP server for autonomous operation:**

1. **Neon MCP Server** ([GitHub](https://github.com/neondatabase/mcp-server-neon) | [Docs](https://neon.com/docs/ai/neon-mcp-server)) ✅ **HIGH VALUE**
   - **Enables:** Create Neon databases, get connection strings, run migrations
   - **Eliminates:** Manual database setup, connection string copy/paste
   - **Setup:** `neonctl@latest init` (auto-configures for Claude Code)
   - **Without this:** Human must create DB manually and provide connection string

**Optional MCP servers for debugging (not required for happy path):**

2. **AWS CloudWatch MCP Server** ([Docs](https://awslabs.github.io/mcp/servers/cloudwatch-mcp-server)) ⚠️ **DEBUGGING ONLY**
   - **Use for:** Reading CloudWatch logs when troubleshooting deployment failures
   - **NOT for:** Deployment (use SST CLI for all infrastructure deployment)
   - **Agent can verify deployment without this:** `sst deploy` exit code + `curl` CloudFront URL
   - **Part of:** AWS Labs official MCP servers ([GitHub](https://github.com/awslabs/mcp))

3. **GitHub MCP Server** ([GitHub](https://github.com/github/github-mcp-server)) ⚠️ **DEBUGGING ONLY**
   - **Use for:** Reading CI logs when tests fail (`get_job_logs` tool)
   - **Agent can verify CI without this:** GitHub Actions exit status visible in PR
   - **Nice to have, not required**

**Important:** All infrastructure deployment is handled via **SST CLI** (`pnpm sst deploy`). AWS MCP server is only for observability/debugging, NOT for creating resources.

---

### 1. Neon Database Setup (Production Only)

**🧑 Human must do this before deploying to production:**

1. Go to https://neon.tech and create a free account
2. Create a new project called "turnout-production"
3. Copy the connection string (starts with `postgresql://`)
4. Save it securely - you'll set it as an SST secret for production stage

**Expected output:** A connection string like:
```
postgresql://user:password@ep-cool-name-12345.us-east-2.aws.neon.tech/turnoutdb?sslmode=require
```

**Note:** Local development and testing use Docker Postgres (see Phase 0), not Neon. Neon is only for deployed stages (production, and optionally per-developer dev stages).

**Alternative with Neon MCP server (if available):**
- Agent could create production database via MCP
- Agent could retrieve connection string via MCP
- Agent could create per-developer dev databases for `sst dev` usage

### 2. AWS Credentials Setup

**🧑 Human must do this before agent starts:**

1. Ensure you have an AWS account with admin access
2. Install AWS CLI: https://aws.amazon.com/cli/
3. Configure credentials: `aws configure`
4. Verify: `aws sts get-caller-identity` should return your account info

**Note:** AWS MCP server does NOT handle credentials or deployment. All infrastructure deployment is via SST CLI. AWS MCP is only for reading CloudWatch logs when debugging.

### 3. Required Tools

**Agent can verify these are installed:**

- **Node.js 20+:** Run `node --version`
- **pnpm 8+:** Run `pnpm --version` (if not installed: `npm install -g pnpm`)
- **Docker Desktop:** Run `docker ps` (must be running)
- **Git:** Run `git --version`

**If any are missing, agent should halt and request human install them.**

### 4. SST Secret Strategy

**Architecture decision:** All configuration comes from SST secrets, not `.env` files.

**Per-developer stages:**
- Each developer gets their own SST stage: `--stage $USER`
- Prevents collisions when multiple developers work on the project
- Stage examples: `--stage sdebaun`, `--stage alice`, `--stage production`

**Database strategy:**
- **Local development/testing:** Docker Postgres (fast, isolated)
  - SST secret points to `postgresql://localhost:5432/turnout_dev`
  - Agent sets this in Phase 0
- **Production deployment:** Neon Postgres (serverless, managed)
  - Human sets `sst secret set DatabaseUrl "<neon-url>" --stage production`
  - Only needed when ready to deploy to production

**No `.env` file needed.** All secrets managed through SST.

---

## Project Structure

```
turnout-mvp/
├── apps/
│   ├── web/                      # Next.js app (IS a package)
│   │   ├── app/
│   │   │   ├── page.tsx          # Hello world page
│   │   │   └── actions.ts        # Hello world Server Action
│   │   ├── next.config.js
│   │   ├── tsconfig.json         # Extends root, adds Next.js specifics
│   │   └── package.json
│   │
│   └── functions/                # Lambda handlers (IS a package)
│       ├── src/
│       │   └── hello-cron.ts     # Hello world cron handler
│       ├── tsconfig.json         # Extends root
│       └── package.json
│
├── lib/                          # Shared code (NOT a package)
│   └── db/
│       ├── index.ts              # Re-exports prisma client
│       ├── client.ts             # Prisma client singleton
│       ├── schema.prisma         # Minimal schema (User model)
│       └── db.test.ts            # Tests DB connection and Prisma client
│
├── tests/
│   └── e2e/
│       ├── tdd0000-bootstrap/    # E2E tests for bootstrap (smoke tests)
│       │   ├── homepage.spec.ts
│       │   └── server-action.spec.ts
│       └── journeys/             # Cross-feature user flows (empty for now)
│
├── .github/
│   └── workflows/
│       └── ci.yml                # Run tests on PR
│
├── pnpm-workspace.yaml           # Defines apps/* as workspaces
├── package.json                  # Root package.json
├── tsconfig.json                 # Base TypeScript config
├── sst.config.ts                 # Infrastructure as Code
├── docker-compose.yml            # Local Postgres
├── vitest.config.ts              # Vitest configuration
├── playwright.config.ts          # Playwright configuration
└── README.md                     # Setup instructions
```

---

## Components

**What this touches:**

- [x] Database (Prisma schema with minimal User model)
- [x] Next.js app (hello world page + Server Action)
- [x] Lambda functions (hello world cron handler)
- [x] Infrastructure (SST config for deployment)
- [x] Testing (Vitest + Playwright)
- [x] CI/CD (GitHub Actions)

---

## Implementation Steps (In Order)

**Follow these phases sequentially. Verify each phase before moving to the next.**

---

## Parallelization Strategy for Agent Teams

**IMPORTANT:** When multiple agents are available, parallelize aggressively to maximize velocity.

### Phase Dependencies

**Sequential phases (must run in order):**
- Phase 0: Prerequisites → Phase 1: Project Init → **[Parallel Block]** → Phase 5: Testing → Phase 7: Deployment → Phase 8: CI

**Parallel block (Phases 2-4 can run simultaneously):**
- Phase 2: Database layer (lib/db)
- Phase 3: Next.js app (apps/web)
- Phase 4: Lambda functions (apps/functions)

These three phases are **independent** - they create separate directories and don't depend on each other's outputs.

### Team Allocation

**Recommended for 3-agent team:**
- **Agent 1 (Database specialist):** Phase 2 - Set up Prisma, migrations, db tests
- **Agent 2 (Frontend specialist):** Phase 3 - Set up Next.js app, Server Actions, E2E tests
- **Agent 3 (Backend specialist):** Phase 4 - Set up Lambda functions, cron handler

**Synchronization point:** All three agents must complete and report success before **any** agent proceeds to Phase 5 (Testing).

**For solo agent:** Execute Phases 2-4 sequentially (order doesn't matter).

### Communication Protocol for Parallel Work

When running in parallel:
1. Each agent claims their phase: "Starting Phase X"
2. Each agent reports completion: "Phase X complete, verification passed"
3. Team lead (or coordinating agent) waits for all three completions
4. Once all report success, proceed to Phase 5

**If any parallel phase fails:** All agents halt, debug the failure, then restart parallel block.

---

### Phase 0: Prerequisite Verification & SST Setup

**Agent must verify or halt before proceeding:**

**1. Check required tools:**
```bash
# Verify Node.js 20+
node --version  # Should be >=20

# Verify pnpm 8+
pnpm --version  # Should be >=8

# Verify Git
git --version

# Verify Docker (and start if needed)
docker ps 2>/dev/null || {
  echo "Docker not running. Please start Docker Desktop."
  exit 1
}
```

**If any tool is missing or wrong version: HALT and report to human.**

**2. Check AWS credentials:**
```bash
aws sts get-caller-identity
# Should return account info without errors
```

**If AWS credentials not configured: HALT and ask human to run `aws configure`.**

**3. Start Docker Postgres:**
```bash
docker compose up -d
```

Wait for healthy status:
```bash
# Wait up to 30 seconds for postgres to be healthy
timeout 30 bash -c 'until docker compose ps | grep -q "healthy"; do sleep 1; done'
```

**4. Set up SST stage and secrets:**
```bash
# Use username as stage name to prevent collisions
export SST_STAGE=$USER
echo "Using SST stage: $SST_STAGE"

# Install SST first (needed for secret commands)
pnpm add -D sst

# Set DATABASE_URL secret pointing to local Docker
sst secret set DatabaseUrl "postgresql://turnout:turnout_dev_password@localhost:5432/turnout_dev" --stage $SST_STAGE
```

**5. Verify secret was set:**
```bash
sst secret list --stage $SST_STAGE
# Should show: DatabaseUrl
```

**Verify Phase 0:**
- [ ] Node.js 20+, pnpm 8+, Git, Docker all present
- [ ] AWS credentials configured (`aws sts get-caller-identity` works)
- [ ] Docker Postgres running and healthy
- [ ] SST_STAGE environment variable set to username
- [ ] DatabaseUrl secret exists for your stage (`sst secret list` shows it)

**If all checks pass, proceed to Phase 1.**

---

### Phase 1: Project Initialization

**Create root files:**

1. Create `package.json`:
```bash
pnpm init
```
Edit to match the Root Package.json section below.

2. Create `pnpm-workspace.yaml`:
```yaml
packages:
  - 'apps/*'
```

3. Create `tsconfig.json` (base config - see Root tsconfig.json section below)

4. Create `.gitignore`:
```
node_modules
.next
.sst
dist
.DS_Store
```

**Note:** No `.env` file needed - all configuration comes from SST secrets (set in Phase 0).

**Verify Phase 1:**
- [ ] `pnpm --version` works
- [ ] `pnpm-workspace.yaml` exists
- [ ] `.gitignore` exists

**Commit checkpoint:**
```bash
git add .
git commit -m "chore: project initialization (workspace, tsconfig, gitignore)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Phase 2: Shared Database Layer

**Create lib/db structure:**

1. Create directory: `mkdir -p lib/db`

2. Install Prisma at root:
```bash
pnpm add -D prisma @prisma/client
```

3. Create `lib/db/schema.prisma` (see Database Schema section for content)

4. Generate Prisma client:
```bash
pnpm prisma generate
```

5. Create initial migration (uses DATABASE_URL from SST secret):
```bash
sst shell --stage $SST_STAGE -- pnpm prisma migrate dev --name init
```
(This will prompt for migration name - use "init")

**Note:** `sst shell` injects the DatabaseUrl secret as DATABASE_URL environment variable.

6. Create `lib/db/client.ts` (see Prisma Client Singleton section)

7. Create `lib/db/index.ts` (see same section)

8. Create `lib/db/db.test.ts` (see Database Tests section)

**Verify Phase 2:**
- [ ] `node_modules/.prisma/client` directory exists
- [ ] `lib/db/migrations/` directory exists with migration files
- [ ] Docker Postgres running: `docker compose ps`
- [ ] Can connect: `sst shell --stage $SST_STAGE -- pnpm prisma studio` opens (then close it)

**Commit checkpoint:**
```bash
git add lib/ package.json pnpm-lock.yaml
git commit -m "feat: database layer with Prisma

- Add Prisma schema with User model
- Create database client singleton
- Add initial migration
- Add database connection test

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Phase 3: Next.js App

**Create apps/web:**

1. Create directory: `mkdir -p apps/web/app`

2. Create `apps/web/package.json` (see Next.js Configuration section)

3. Install Next.js dependencies (run from apps/web):
```bash
cd apps/web
pnpm install
cd ../..
```

4. Create `apps/web/tsconfig.json` (extends root)

5. Create `apps/web/next.config.js`

6. Create `apps/web/app/page.tsx` (hello world page)

7. Create `apps/web/app/actions.ts` (Server Action)

8. Start dev server:
```bash
pnpm --filter @turnout/web dev
```

**Verify Phase 3:**
- [ ] Server starts without errors
- [ ] Visit http://localhost:3000
- [ ] See "Hello Turnout" heading
- [ ] Button renders
- [ ] Click button, check browser console for Server Action log
- [ ] Stop server (Ctrl+C)

**Commit checkpoint:**
```bash
git add apps/web
git commit -m "feat: Next.js app with hello world page

- Add Next.js 14 app with App Router
- Add hello world page
- Add Server Action calling Prisma
- Configure TypeScript paths for shared lib

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Phase 4: Lambda Functions

**Create apps/functions:**

1. Create directory: `mkdir -p apps/functions/src`

2. Create `apps/functions/package.json`

3. Create `apps/functions/tsconfig.json`

4. Create `apps/functions/src/hello-cron.ts`

**Verify Phase 4:**
- [ ] TypeScript compiles: `pnpm tsc --noEmit` (from root)
- [ ] No type errors in apps/functions

**Commit checkpoint:**
```bash
git add apps/functions
git commit -m "feat: Lambda functions with hello cron handler

- Add functions package with TypeScript config
- Add hello-cron handler that queries Prisma
- Configure path aliases for shared lib

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Phase 5: Testing Infrastructure

**Set up Vitest and Playwright:**

1. Install test dependencies at root:
```bash
pnpm add -D vitest @playwright/test
```

2. Create `vitest.config.ts`

3. Create `vitest.setup.ts`

4. Create `playwright.config.ts`

5. Install Playwright browsers:
```bash
pnpm playwright install chromium
```

6. Create test directories:
```bash
mkdir -p tests/e2e/tdd0000-bootstrap
mkdir -p tests/e2e/journeys
```

7. Create `tests/e2e/journeys/.gitkeep` (empty file to keep folder in git)

8. Create E2E test files (see E2E Tests section)

9. Run tests (using SST shell to inject DATABASE_URL):
```bash
# Unit tests (lib/db/db.test.ts)
sst shell --stage $SST_STAGE -- pnpm test:unit

# E2E tests
sst shell --stage $SST_STAGE -- pnpm test:e2e
```

**Note:** `sst shell` injects the DatabaseUrl secret as DATABASE_URL before running tests.

**If tests fail:**
1. **Read the output carefully** - Test failures contain specific error messages and stack traces
2. **Attempt to fix** - Try to resolve the issue (max 2 attempts):
   - Check file paths and imports
   - Verify database connection (is Docker running?)
   - Check for typos in test expectations
   - Review the code being tested
3. **If still failing after 2 fix attempts:**
   - **HALT** - Do not proceed to next phase
   - **Report to human** with:
     - Full test output (copy/paste the error)
     - What you tried to fix (be specific)
     - Current hypothesis on root cause
     - Relevant file contents if helpful
4. **Never skip tests or proceed with failures** - Tests are acceptance criteria

**Verify Phase 5:**
- [ ] Unit tests pass (db.test.ts)
- [ ] E2E tests pass (homepage, server-action)
- [ ] No test failures

**Commit checkpoint:**
```bash
git add tests/ vitest.config.ts vitest.setup.ts playwright.config.ts package.json pnpm-lock.yaml
git commit -m "test: add testing infrastructure and bootstrap smoke tests

- Configure Vitest for unit tests
- Configure Playwright for E2E tests
- Add database connection test
- Add homepage and server action E2E tests
- All tests passing

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Phase 6: Docker Compose (Already Complete)

**Docker Postgres was started in Phase 0.** No additional steps needed.

**Verify Phase 6 (if not already done):**
- [ ] `docker compose ps` shows postgres running
- [ ] `docker compose ps` shows "healthy" status

---

### Phase 7: SST Configuration & Deployment

**If not already running:**

1. Create `docker-compose.yml` (see Docker Compose section)

2. Start Postgres:
```bash
docker compose up -d
```

3. Verify connection:
```bash
docker compose ps
# Should show turnout-postgres running

pnpm prisma studio
# Should open browser with Prisma Studio
```

**Verify Phase 6:**
- [ ] Docker container running
- [ ] Prisma Studio can connect (via `sst shell`)

---

### Phase 7: SST Configuration & Deployment

**Prerequisites already completed in Phase 0:**
- ✅ AWS credentials configured
- ✅ SST installed
- ✅ DatabaseUrl secret set for your stage

**1. Create `sst.config.ts`** (see SST Configuration section)

**2. Deploy to your dev stage:**
```bash
sst deploy --stage $SST_STAGE
```

**This will take 5-10 minutes on first deploy.**

**3. Save the output:**
- CloudFront URL (web.url)
- Cron function name

**Verify Phase 7:**
- [ ] Deployment exits with code 0
- [ ] Output shows CloudFront URL
- [ ] Output shows Cron function name

**Programmatic verification (agent can do):**

**1. Verify Next.js deployment:**
```bash
# Get the deployed URL
DEPLOY_URL=$(sst output --stage $SST_STAGE web.url)

# Retry up to 5 times (handles cold starts)
for i in {1..5}; do
  echo "Attempt $i: Checking $DEPLOY_URL"
  CODE=$(curl -s -o /dev/null -w "%{http_code}" $DEPLOY_URL)

  if [ "$CODE" = "200" ]; then
    echo "✓ Deployment verified (HTTP 200)"
    break
  else
    echo "Got HTTP $CODE, retrying..."
    [ $i -eq 5 ] && echo "✗ Deployment failed after 5 attempts" && exit 1
    sleep 2
  fi
done
```

**2. Verify cron Lambda works (don't wait 1 hour):**
```bash
# Get the function name from SST outputs
FUNCTION_NAME=$(sst output --stage $SST_STAGE cron)

# Invoke the Lambda function manually
aws lambda invoke \
  --function-name $FUNCTION_NAME \
  --invocation-type RequestResponse \
  --payload '{}' \
  /tmp/cron-output.json

# Check the response
cat /tmp/cron-output.json
# Should show: {"statusCode":200,"body":"{\"message\":\"Cron executed successfully\",...}"}

# Verify it logged user count
grep -q "User count" /tmp/cron-output.json && echo "✓ Cron executed successfully" || echo "✗ Cron output unexpected"
```

**Manual verification (human or MCP server):**
- Visit CloudFront URL in browser - should see "Hello Turnout"
- Check CloudWatch logs for manual Lambda invocation (optional)

**Commit checkpoint:**
```bash
git add sst.config.ts docker-compose.yml
git commit -m "feat: add SST infrastructure configuration

- Configure SST for Next.js deployment to Lambda@Edge
- Configure cron job for hello-world Lambda
- Add Docker Compose for local Postgres
- Successfully deployed to stage: $SST_STAGE

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Phase 8: GitHub Actions CI

**⚠️ HUMAN REQUIRED: GitHub repository must exist**

1. Create `.github/workflows/ci.yml` (see GitHub Actions CI section)

2. Commit CI configuration:
```bash
git add .github/
git commit -m "ci: add GitHub Actions workflow

- Run tests on PR and push to main
- Type check with TypeScript
- Use GitHub Actions postgres service for tests

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

3. Push to GitHub:
```bash
git push origin main
```

4. Check GitHub Actions tab - CI should run automatically

**Verify Phase 8:**
- [ ] All files committed
- [ ] Pushed to remote
- [ ] CI runs (check GitHub Actions tab)
- [ ] CI passes (all jobs green)

**Alternative verification (GitHub MCP server if available):**
- Agent could check CI status via MCP
- Agent could read CI logs via MCP

---

## Database Schema

### Prisma Schema

**File:** `lib/db/schema.prisma`

```prisma
// This is a minimal schema just to prove Prisma works.
// Real schema (User, Group, Turnout, etc.) will be added in feature TDDs.

generator client {
  provider = "prisma-client-js"
  output   = "../../../node_modules/.prisma/client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id          String   @id @default(cuid())
  phoneNumber String   @unique
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([phoneNumber])
}
```

**Why this schema?**
- Proves Prisma migrations work
- Proves TypeScript types are generated
- Proves both apps can import from `lib/db`
- Simple enough to not distract from infrastructure setup
- Phone number field aligns with architecture decision (phone-based auth)

### Prisma Client Singleton

**File:** `lib/db/client.ts`

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**File:** `lib/db/index.ts`

```typescript
export { prisma } from './client'
```

**Why this structure?**
- Singleton prevents "too many connections" in development
- Shared by both Next.js and Lambda functions
- TypeScript imports work via path aliases

---

## Next.js App (apps/web)

### Hello World Page

**File:** `apps/web/app/page.tsx`

```typescript
import { incrementCounter } from './actions'

export default async function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Hello Turnout</h1>
      <p className="mb-4">Bootstrap successful! 🎉</p>

      <form action={incrementCounter}>
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Test Server Action
        </button>
      </form>
    </main>
  )
}
```

### Hello World Server Action

**File:** `apps/web/app/actions.ts`

```typescript
'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function incrementCounter() {
  // Just prove we can call Prisma from a Server Action
  const userCount = await prisma.user.count()
  console.log(`Server Action called. User count: ${userCount}`)

  revalidatePath('/')
  return { success: true, count: userCount }
}
```

### Next.js Configuration

**File:** `apps/web/next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    externalDir: true, // Allow imports from outside app directory (../../lib)
  },
}

module.exports = nextConfig
```

**File:** `apps/web/tsconfig.json`

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "jsx": "preserve",
    "lib": ["dom", "dom.iterable", "esnext"],
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"],
      "@/lib/*": ["../../lib/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**File:** `apps/web/package.json`

```json
{
  "name": "@turnout/web",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.0.0"
  }
}
```

---

## Lambda Functions (apps/functions)

### Hello World Cron Handler

**File:** `apps/functions/src/hello-cron.ts`

```typescript
import { prisma } from '@/lib/db'

export async function handler() {
  console.log('Hello from cron! Timestamp:', new Date().toISOString())

  // Prove we can query Prisma from Lambda
  const userCount = await prisma.user.count()
  console.log('User count:', userCount)

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Cron executed successfully',
      userCount,
      timestamp: new Date().toISOString()
    })
  }
}
```

### Functions Configuration

**File:** `apps/functions/tsconfig.json`

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "module": "ESNext",
    "paths": {
      "@/lib/*": ["../../lib/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

**File:** `apps/functions/package.json`

```json
{
  "name": "@turnout/functions",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "dependencies": {},
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

---

## SST Configuration

**File:** `sst.config.ts`

```typescript
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app: (input) => ({
    name: "turnout",
    removal: input?.stage === "production" ? "retain" : "remove",
    home: "aws",
  }),
  async run() {
    // Database URL from SST Secret (set via `sst secret set DATABASE_URL <value>`)
    const databaseUrl = new sst.Secret("DatabaseUrl")

    // Next.js app
    const web = new sst.aws.Nextjs("TurnoutWeb", {
      path: "./apps/web",
      link: [databaseUrl],
      environment: {
        DATABASE_URL: databaseUrl.value,
      },
    })

    // Hello world cron job - runs every hour
    const helloCron = new sst.aws.Cron("HelloCron", {
      job: {
        handler: "./apps/functions/src/hello-cron.handler",
        link: [databaseUrl],
        environment: {
          DATABASE_URL: databaseUrl.value,
        },
      },
      schedule: "rate(1 hour)",
    })

    return {
      web: web.url,
      cron: helloCron.name,
    }
  },
})
```

**Key decisions:**
- `removal: "retain"` for production (don't accidentally delete data)
- `removal: "remove"` for dev (clean up after testing)
- Database URL via SST Secret (not checked into git)
- Cron runs every hour (just to prove it works, not useful yet)

---

## Testing Infrastructure

### Testing Philosophy

**Tests live with the code they test:**

- **Unit tests:** Co-located with the module they test
  - `lib/db/db.test.ts` tests `lib/db/`
  - `apps/web/app/actions.test.ts` tests `apps/web/app/actions.ts`
  - Import path is simple: `import { prisma } from './index'`

- **E2E tests:** Organized by TDD in `tests/e2e/tddXXXX-name/`
  - Each TDD gets its own folder for E2E tests
  - Makes it clear which tests validate which feature
  - Example: `tests/e2e/tdd0001-phone-identity/otp-flow.spec.ts`
  - Use Playwright, not Vitest

- **Journey tests:** Cross-feature user flows in `tests/e2e/journeys/`
  - For tests that span multiple TDDs
  - Named after user stories (e.g., `bob-creates-first-turnout.spec.ts`)
  - Test complete user workflows, not individual features

- **Future integration tests:** Only when needed
  - If you need to test workflows that span multiple modules (e.g., "RSVP creates engagement AND sends SMS"), create `tests/integration/`
  - But don't create it until you actually have cross-module integration to test

### Vitest Configuration

**File:** `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@/lib': path.resolve(__dirname, './lib'),
    },
  },
})
```

**File:** `vitest.setup.ts`

```typescript
import { beforeAll, afterAll } from 'vitest'

beforeAll(async () => {
  // Setup: ensure test database is ready
  console.log('Test setup: checking database connection')
})

afterAll(async () => {
  // Cleanup: disconnect from database
  console.log('Test cleanup: disconnecting from database')
})
```

### Database Tests (Co-located with lib/db)

**File:** `lib/db/db.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { prisma } from './index'

describe('Database Connection', () => {
  it('can connect to Postgres and run queries', async () => {
    // This is a smoke test - just prove Prisma works
    const count = await prisma.user.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  it('can create and query a user', async () => {
    const phoneNumber = `+1555${Date.now()}`

    const user = await prisma.user.create({
      data: { phoneNumber },
    })

    expect(user.id).toBeTruthy()
    expect(user.phoneNumber).toBe(phoneNumber)

    // Cleanup
    await prisma.user.delete({ where: { id: user.id } })
  })
})
```

**Why co-located?** This test is specifically testing `lib/db` - the Prisma client and database connection. It belongs with the code it tests, not in a separate `tests/integration/` folder.

### Playwright Configuration

**File:** `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm --filter @turnout/web dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

**Note:** Playwright starts Next.js directly (`next dev`), not through SST. However:
- **Locally:** When running `sst shell --stage $USER -- pnpm test:e2e`, the DATABASE_URL is injected into the environment before Playwright starts, so Next.js inherits it
- **CI:** DATABASE_URL is passed as an environment variable, so Next.js inherits it from the CI environment

### E2E Tests (Organized by TDD)

**Why organized by TDD?**
- Each TDD gets a folder in `tests/e2e/tddXXXX-name/`
- Makes it clear which tests validate which feature
- Easy to see test coverage: "Did we test tdd0001?" → Check if folder exists
- Agent handoff: TDD says where to put tests
- Traceability: Feature spec → Acceptance tests

**File:** `tests/e2e/tdd0000-bootstrap/homepage.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test('homepage loads and displays hello message', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('h1')).toHaveText('Hello Turnout')
  await expect(page.locator('text=Bootstrap successful!')).toBeVisible()
})
```

**File:** `tests/e2e/tdd0000-bootstrap/server-action.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test('server action button is rendered and clickable', async ({ page }) => {
  await page.goto('/')

  const button = page.locator('button[type="submit"]')
  await expect(button).toBeVisible()
  await expect(button).toHaveText('Test Server Action')

  // Click it to prove Server Actions work
  await button.click()
  // Server Action logs to console, but doesn't change UI for bootstrap
  // Real features will have observable UI changes to test
})
```

**File:** `tests/e2e/journeys/.gitkeep`

_(Empty for now - this folder will hold cross-feature user journey tests like "bob-creates-first-turnout.spec.ts")_

---

## Docker Compose (Local Development)

**File:** `docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: turnout-postgres
    environment:
      POSTGRES_USER: turnout
      POSTGRES_PASSWORD: turnout_dev_password
      POSTGRES_DB: turnout_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

**Local DATABASE_URL:** `postgresql://turnout:turnout_dev_password@localhost:5432/turnout_dev`

---

## GitHub Actions CI

**File:** `.github/workflows/ci.yml`

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: turnout
          POSTGRES_PASSWORD: turnout_test_password
          POSTGRES_DB: turnout_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run Prisma migrations
        run: pnpm prisma migrate deploy
        env:
          DATABASE_URL: postgresql://turnout:turnout_test_password@localhost:5432/turnout_test

      - name: Type check
        run: pnpm tsc --noEmit

      - name: Run tests
        run: pnpm test:unit
        env:
          DATABASE_URL: postgresql://turnout:turnout_test_password@localhost:5432/turnout_test

      - name: Install Playwright browsers
        run: pnpm playwright install --with-deps chromium

      - name: Run E2E tests
        run: pnpm test:e2e
        env:
          DATABASE_URL: postgresql://turnout:turnout_test_password@localhost:5432/turnout_test
```

**Note on CI approach:**
- CI runs `test:unit` and `test:e2e` directly (not the wrapper `test` script)
- This avoids needing SST/AWS in CI
- DATABASE_URL is passed as environment variable, not from SST secrets
- Tests verify code correctness, not infrastructure configuration

---

## Root Configuration Files

### pnpm Workspace

**File:** `pnpm-workspace.yaml`

```yaml
packages:
  - 'apps/*'
```

### Root Package.json

**File:** `package.json`

```json
{
  "name": "turnout",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "sst dev --stage ${SST_STAGE:-$USER}",
    "build": "pnpm --filter @turnout/web build",
    "test": "sst shell --stage ${SST_STAGE:-$USER} -- sh -c 'pnpm test:unit && pnpm test:e2e'",
    "test:unit": "vitest run",
    "test:e2e": "playwright test",
    "db:migrate": "sst shell --stage ${SST_STAGE:-$USER} -- prisma migrate dev",
    "db:studio": "sst shell --stage ${SST_STAGE:-$USER} -- prisma studio",
    "db:push": "sst shell --stage ${SST_STAGE:-$USER} -- prisma db push",
    "db:generate": "prisma generate",
    "deploy": "sst deploy --stage production",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@playwright/test": "^1.42.0",
    "@prisma/client": "^5.10.0",
    "prisma": "^5.10.0",
    "sst": "3.0.0",
    "typescript": "^5.3.0",
    "vitest": "^1.3.0"
  }
}
```

### Root tsconfig.json

**File:** `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "checkJs": false,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "incremental": true
  },
  "exclude": ["node_modules", ".next", "dist", ".sst"]
}
```

### Configuration via SST Secrets

**No `.env` file needed.** All configuration is managed through SST secrets.

**Setup per developer:**
```bash
# Use your username as stage name
export SST_STAGE=$USER

# Set secret pointing to local Docker (for development/testing)
sst secret set DatabaseUrl "postgresql://turnout:turnout_dev_password@localhost:5432/turnout_dev" --stage $SST_STAGE
```

**For production deployment:**
```bash
# Set secret pointing to Neon (when ready to deploy)
sst secret set DatabaseUrl "postgresql://user:password@ep-xxx.neon.tech/turnoutdb?sslmode=require" --stage production
```

---

## Deployment Instructions

### Prerequisites

1. **AWS Account:** SST will deploy to your AWS account
2. **Neon Account:** Create a free Postgres database at neon.tech
3. **AWS CLI configured:** `aws configure` with your credentials

### First-Time Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd turnout-mvp
pnpm install

# 2. Start local Postgres
docker compose up -d

# 3. Set up your SST stage and secret
export SST_STAGE=$USER
sst secret set DatabaseUrl "postgresql://turnout:turnout_dev_password@localhost:5432/turnout_dev" --stage $SST_STAGE

# 4. Run Prisma migrations
pnpm db:migrate

# 5. Start SST dev server
pnpm dev
# Visit http://localhost:3000

# 6. Run tests
pnpm test
```

### Deploy to Production

```bash
# 1. Set production DATABASE_URL secret (Neon connection string)
sst secret set DatabaseUrl "postgresql://user:pass@neon.tech/db" --stage production

# 2. Deploy
pnpm deploy

# Output:
#   TurnoutWeb: https://xyz.cloudfront.net
#   HelloCron: turnout-production-HelloCron
```

### Verify Deployment

1. **Visit the CloudFront URL** - should see "Hello Turnout"
2. **Check CloudWatch Logs** - cron should log every hour
3. **Check SST console** - `sst console` to see resources

---

## Open Questions

**All prerequisites are now documented in the Prerequisites section.** Human should complete those before handing to agent team.

---

## Troubleshooting

### "Prisma Client did not initialize yet"

**Problem:** TypeScript errors saying Prisma client doesn't exist.

**Solutions:**
1. Run `pnpm prisma generate`
2. Check that `node_modules/.prisma/client` directory exists
3. Restart TypeScript server (if using VS Code: Cmd+Shift+P → "TypeScript: Restart TS Server")
4. Check that `@prisma/client` is in package.json dependencies

---

### "Cannot find module '@/lib/db'"

**Problem:** Import errors for shared lib code.

**Solutions:**
1. Check `tsconfig.json` has correct paths configuration:
   ```json
   "paths": {
     "@/lib/*": ["../../lib/*"]
   }
   ```
2. Verify file exists at `lib/db/index.ts`
3. Restart TypeScript server
4. Check that you're importing from the correct path based on your file location

---

### "Error: connect ECONNREFUSED ::1:5432"

**Problem:** Can't connect to Postgres.

**Solutions:**
1. Is Docker running? `docker ps` should list containers
2. Is Postgres container running? `docker compose ps`
3. Start Postgres: `docker compose up -d`
4. Verify SST secret: `sst secret list --stage $SST_STAGE` should show DatabaseUrl
5. Test connection: `sst shell --stage $SST_STAGE -- sh -c 'echo $DATABASE_URL'` (should show connection string)
6. Try connecting manually with secret: `sst shell --stage $SST_STAGE -- sh -c 'psql $DATABASE_URL'` (if psql installed)

---

### SST Deploy Fails: "No credentials found"

**Problem:** `pnpm sst deploy` fails with AWS credential errors.

**🧑 HUMAN REQUIRED:**
1. Run `aws configure` and enter credentials
2. Or set environment variables:
   ```bash
   export AWS_ACCESS_KEY_ID=your_key
   export AWS_SECRET_ACCESS_KEY=your_secret
   ```
3. Verify: `aws sts get-caller-identity`

**Note:** AWS MCP server is for debugging only (reading CloudWatch logs). It does NOT handle credentials or deployment. Use SST CLI for all infrastructure operations.

---

### SST Deploy Fails: "Resource handler returned message..."

**Problem:** Deployment fails partway through.

**Solutions:**
1. Check the error message for which resource failed
2. Common issues:
   - CloudFront distribution limit reached (AWS account limit)
   - Lambda function name conflict (already exists)
   - IAM permission issues
3. Try deploying again: `pnpm sst deploy --stage dev`
4. If still fails, destroy and redeploy:
   ```bash
   pnpm sst remove --stage dev
   pnpm sst deploy --stage dev
   ```

**🧑 HUMAN REQUIRED if:**
- AWS account limits hit (need to request increase)
- IAM permissions insufficient (need admin to grant)

---

### Tests Fail: "Cannot find module 'vitest'"

**Problem:** Vitest not installed.

**Solutions:**
1. Install test dependencies: `pnpm add -D vitest @playwright/test`
2. Check root package.json has vitest in devDependencies
3. Run `pnpm install` to ensure everything is installed

---

### E2E Tests Fail: "Executable doesn't exist"

**Problem:** Playwright browsers not installed.

**Solutions:**
1. Install browsers: `pnpm playwright install chromium`
2. Or install all browsers: `pnpm playwright install`
3. Check that chromium browser was downloaded

---

### Prisma Migrate Fails: "Database already exists"

**Problem:** Trying to run migrations but database state is unclear.

**Solutions:**
1. For development, reset database: `pnpm prisma migrate reset` (WARNING: destroys data)
2. Or use db push for prototyping: `pnpm prisma db push`
3. Check migration status: `pnpm prisma migrate status`

---

### Next.js Dev Server Won't Start

**Problem:** `pnpm dev` fails or hangs.

**Solutions:**
1. Check port 3000 isn't already in use: `lsof -i :3000`
2. Kill existing process: `kill -9 <PID>`
3. Clear Next.js cache: `rm -rf apps/web/.next`
4. Check for TypeScript errors: `pnpm tsc --noEmit`
5. Reinstall dependencies: `rm -rf node_modules && pnpm install`

---

### "Module not found: Can't resolve 'react'"

**Problem:** Next.js can't find React dependencies.

**Solutions:**
1. Install Next.js dependencies in apps/web:
   ```bash
   cd apps/web
   pnpm install
   cd ../..
   ```
2. Check apps/web/package.json has react and react-dom
3. Run `pnpm install` from root to sync workspace

---

### GitHub Actions CI Fails

**Problem:** CI pipeline fails on GitHub.

**🧑 HUMAN REQUIRED: Access GitHub to see logs**

**Common issues:**
1. Missing secrets (if any were added)
2. Postgres service not ready (increase health check timeout)
3. Node/pnpm version mismatch
4. Tests passing locally but failing in CI (timing issues)

**Solutions:**
1. Check CI logs on GitHub Actions tab
2. Run the same commands locally that CI runs
3. Ensure .github/workflows/ci.yml matches the TDD spec

**Alternative with GitHub MCP server:**
- Agent could read CI logs via MCP
- Agent could check workflow status

---

## Related Context

- **PRD:** N/A (Infrastructure bootstrap - precedes all PRDs)
- **Roadmap Phase:** Pre-MVP (blocks all MVP work)
- **Related TDDs:** This is TDD0000. All future TDDs (starting with tdd0001-phone-identity) depend on this.
- **First Feature TDD:** tdd0001-phone-identity (depends on this bootstrap)

---

## Migration Notes

**This is a greenfield setup** - no existing data to migrate.

**Safe to deploy?** Yes, this creates new infrastructure from scratch.

**Can roll back?** Yes, `sst remove` will tear down all AWS resources (except on production stage).

---

## Notes for Implementer

1. **Start with local dev first:** Get `pnpm dev` working before touching SST/AWS
2. **Test incrementally:** After each component (Next.js, Prisma, cron), verify it works locally
3. **SST deployment is the final step:** Only deploy to AWS once everything works locally
4. **Don't skip the tests:** The smoke tests prove the infrastructure actually works
5. **E2E test organization matters:** Create `tests/e2e/tdd0000-bootstrap/` folder and put both test files in it. This establishes the pattern for all future TDDs.
6. **Ask questions early:** If anything is unclear, ask before building the wrong thing

**This TDD is "hello world" infrastructure.** Don't add features (auth, turnouts, etc.) - those come in future TDDs.

**This establishes the test organization pattern:**
- Unit tests co-located with code (`lib/db/db.test.ts`)
- E2E tests organized by TDD (`tests/e2e/tdd0000-bootstrap/`)
- Future journey tests go in `tests/e2e/journeys/`

---

## Agent Autonomy Summary

**With NO MCP servers configured:**
- Agent autonomy: ~70%
- Human must: Create Neon DB, provide connection string
- Agent can: Write all code, run local tests, deploy via SST, verify deployment via CLI/curl

**With Neon MCP server configured:**
- Agent autonomy: ~95%
- Human must: One-time Neon account approval
- Agent can: Everything including database setup, deployment, and verification

**Recommended MCP server for this TDD:**
1. ✅ [Neon MCP Server](https://github.com/neondatabase/mcp-server-neon) - **Required for autonomous DB setup**

**Optional MCP servers (debugging only):**
2. ⚠️ [AWS CloudWatch MCP Server](https://awslabs.github.io/mcp/servers/cloudwatch-mcp-server) - Read logs when troubleshooting
3. ⚠️ [GitHub MCP Server](https://github.com/github/github-mcp-server) - Read CI logs when tests fail

**Setup command for Neon MCP:**
```bash
npx neonctl@latest init
```
This auto-configures Neon MCP Server for Claude Code.

**Note on AWS MCP:** Agent does NOT use AWS MCP for deployment. All infrastructure deployment is handled via SST CLI (`pnpm sst deploy`). AWS MCP is only for observability (reading CloudWatch logs) when debugging issues.
