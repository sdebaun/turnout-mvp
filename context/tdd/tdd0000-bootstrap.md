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

### 1. Neon Database Setup

**🧑 Human must do this before agent starts:**

1. Go to https://neon.tech and create a free account
2. Create a new project called "turnout-dev"
3. Copy the connection string (starts with `postgresql://`)
4. Save it securely - you'll provide it to the agent as an environment variable

**Expected output:** A connection string like:
```
postgresql://user:password@ep-cool-name-12345.us-east-2.aws.neon.tech/turnoutdb?sslmode=require
```

**Alternative with Neon MCP server (if available):**
- Agent could create database via MCP
- Agent could retrieve connection string via MCP

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

### 4. Environment Variables

**🧑 Human must provide to agent:**

Create a `.env` file at project root with:
```bash
DATABASE_URL="<neon-connection-string-from-step-1>"
AWS_REGION="us-east-1"  # or your preferred region
```

**Agent will use these values when setting up SST secrets and running migrations.**

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
├── .env.example                  # Example environment variables
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

4. Create `.env` file with DATABASE_URL from prerequisites

5. Create `.env.example` (without actual credentials)

6. Create `.gitignore`:
```
node_modules
.next
.sst
dist
.env
.DS_Store
```

**Verify Phase 1:**
- [ ] `pnpm --version` works
- [ ] `pnpm-workspace.yaml` exists
- [ ] `.env` has DATABASE_URL

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

5. Create initial migration:
```bash
pnpm prisma migrate dev --name init
```
(This will prompt for migration name - use "init")

6. Create `lib/db/client.ts` (see Prisma Client Singleton section)

7. Create `lib/db/index.ts` (see same section)

8. Create `lib/db/db.test.ts` (see Database Tests section)

**Verify Phase 2:**
- [ ] `node_modules/.prisma/client` directory exists
- [ ] `lib/db/migrations/` directory exists with migration files
- [ ] Docker Postgres running: `docker compose ps`
- [ ] Can connect: `pnpm prisma studio` opens (then close it)

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

9. Run tests:
```bash
# Unit tests (lib/db/db.test.ts)
pnpm test:unit

# E2E tests
pnpm test:e2e
```

**Verify Phase 5:**
- [ ] Unit tests pass (db.test.ts)
- [ ] E2E tests pass (homepage, server-action)
- [ ] No test failures

---

### Phase 6: Docker Compose (Local Postgres)

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
- [ ] Prisma Studio can connect
- [ ] DATABASE_URL in .env matches docker-compose credentials

---

### Phase 7: SST Configuration & Deployment

**⚠️ HUMAN REQUIRED: AWS credentials must be configured (see Prerequisites)**

1. Install SST:
```bash
pnpm add -D sst
```

2. Create `sst.config.ts` (see SST Configuration section)

3. Set DATABASE_URL as SST secret:
```bash
sst secret set DatabaseUrl "$DATABASE_URL"
```
(Uses DATABASE_URL from .env)

4. Deploy to dev stage:
```bash
pnpm sst deploy --stage dev
```

**This will take 5-10 minutes on first deploy.**

5. Save the output:
- CloudFront URL (web.url)
- Cron function name

**Verify Phase 7:**
- [ ] Deployment exits with code 0
- [ ] Output shows CloudFront URL
- [ ] Output shows Cron function name

**Programmatic verification (agent can do):**
```bash
# Check if deployed site returns 200
DEPLOY_URL=$(sst output --stage dev web.url)
curl -s -o /dev/null -w "%{http_code}" $DEPLOY_URL
# Should output: 200
```

**Manual verification (human or MCP server):**
- Visit CloudFront URL in browser - should see "Hello Turnout"
- Check CloudWatch logs for cron execution (wait 1 hour)

---

### Phase 8: GitHub Actions CI

**⚠️ HUMAN REQUIRED: GitHub repository must exist**

1. Create `.github/workflows/ci.yml` (see GitHub Actions CI section)

2. Commit all files:
```bash
git add .
git commit -m "Initial bootstrap

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
    "dev": "pnpm --filter @turnout/web dev",
    "build": "pnpm --filter @turnout/web build",
    "test": "pnpm test:unit && pnpm test:e2e",
    "test:unit": "vitest run",
    "test:e2e": "playwright test",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "db:push": "prisma db push",
    "db:generate": "prisma generate",
    "deploy": "sst deploy",
    "sst:dev": "sst dev",
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

### Environment Variables

**File:** `.env.example`

```bash
# Local development
DATABASE_URL="postgresql://turnout:turnout_dev_password@localhost:5432/turnout_dev"

# For SST deployment, set via:
# sst secret set DatabaseUrl <your-neon-connection-string>
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

# 3. Run Prisma migrations
pnpm db:migrate

# 4. Start Next.js dev server
pnpm dev
# Visit http://localhost:3000

# 5. Run tests
pnpm test
```

### Deploy to AWS Dev Stage

```bash
# 1. Set DATABASE_URL secret (Neon connection string)
sst secret set DatabaseUrl "postgresql://user:pass@host/db"

# 2. Deploy
pnpm deploy

# Output:
#   TurnoutWeb: https://xyz.cloudfront.net
#   HelloCron: turnout-dev-HelloCron
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
4. Check DATABASE_URL in .env matches docker-compose.yml credentials
5. Try connecting manually: `psql $DATABASE_URL` (if psql installed)

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
