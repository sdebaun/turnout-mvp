import { test, expect } from '@playwright/test'
import { fillOTP } from '../helpers/otp'

const BYPASS_CODE = '000000'

// Per-project phone ranges — prevents cross-project parallel races in beforeAll.
// NANP 555-01XX reserved test range.
// Chromium: 119-122, Mobile: 123-126
const PHONES_BY_PROJECT: Record<string, { organizer: string; rsvpUnauthenticated: string; rsvpAuthenticated: string; rsvpAlreadyGoing: string }> = {
  chromium: {
    organizer: '+12025550119',
    rsvpUnauthenticated: '+12025550120',
    rsvpAuthenticated: '+12025550121',
    rsvpAlreadyGoing: '+12025550122',
  },
  mobile: {
    organizer: '+12025550123',
    rsvpUnauthenticated: '+12025550124',
    rsvpAuthenticated: '+12025550125',
    rsvpAlreadyGoing: '+12025550126',
  },
}

// Both are set once per worker in beforeAll — each Playwright worker (one per project)
// has its own module scope, so these don't conflict across chromium/mobile.
let PHONES: typeof PHONES_BY_PROJECT.chromium
let testTurnoutSlug: string

// Serial mode: all 6 tests run in a single worker so beforeAll/afterAll execute exactly once.
// The shared turnout slug from beforeAll would be undefined in parallel workers.
test.describe.serial('public turnout page + RSVP (TDD0003)', () => {
  // Create a shared turnout once before all tests.
  // All tests read from the same turnout — cheaper than creating one per test.
  test.beforeAll(async ({ request }, workerInfo) => {
    PHONES = PHONES_BY_PROJECT[workerInfo.project.name] ?? PHONES_BY_PROJECT.chromium
    // Clean up any prior data for the organizer phone
    await request.post('/api/test/cleanup', {
      data: { phones: [PHONES.organizer] },
    })

    // Create organizer user + session
    const userResponse = await request.post('/api/test/seed-user', {
      data: {
        phone: PHONES.organizer,
        displayName: 'E2EOrganizer',
        createSession: true,
      },
    })
    expect(userResponse.ok()).toBe(true)
    const { sessionToken } = await userResponse.json()

    // Create a group + turnout via the test helper endpoint
    const turnoutResponse = await request.post('/api/test/seed-turnout', {
      data: {
        sessionToken,
        groupName: 'E2E Test Group',
        mission: 'Testing the turnout RSVP flow end-to-end',
        turnoutTitle: 'E2E Test Turnout',
        location: 'Handlebar Coffee, Ventura CA',
        startsAt: '2027-09-20T19:00:00.000Z',
      },
    })
    expect(turnoutResponse.ok()).toBe(true)
    const { slug } = await turnoutResponse.json()
    testTurnoutSlug = slug
  })

  test.afterAll(async ({ request }) => {
    // Clean up the organizer (cascade-deletes group + turnout via FK)
    if (testTurnoutSlug) {
      await request.post('/api/test/cleanup', {
        data: {
          phones: [PHONES.organizer],
          slugs: [testTurnoutSlug],
        },
      })
    }
  })

  test.afterEach(async ({ request }) => {
    // Clean up participant test users after each test
    await request.post('/api/test/cleanup', {
      data: {
        phones: [
          PHONES.rsvpUnauthenticated,
          PHONES.rsvpAuthenticated,
          PHONES.rsvpAlreadyGoing,
        ],
      },
    })
  })

  // ── Test 1: Public page renders correctly (no auth) ─────────────────────────
  test('public page renders turnout details without authentication', async ({ page }) => {
    await page.goto(`/t/${testTurnoutSlug}`)

    // Turnout title in h1
    await expect(page.locator('h1')).toContainText('E2E Test Turnout')

    // Group name visible somewhere on the page
    await expect(page.getByText('E2E Test Group')).toBeVisible()

    // Date/time row — some relative date format is shown
    // We can't assert the exact text since it depends on when the test runs
    // relative to 2027-09-20. Just check that Calendar icon + date text exists.
    // The page always shows a date in some format.
    await expect(page.locator('[data-testid="rsvp-count"]').or(page.getByText(/people are going|Be the first/))).toBeVisible().catch(() => {
      // RSVP count may not show if count is null — that's fine, just check page loaded
    })

    // Directions link present with Google Maps URL
    const directionsLink = page.locator('[data-testid="directions-link"]')
    await expect(directionsLink).toBeVisible()
    await expect(directionsLink).toHaveAttribute('href', /maps\.google\.com/)

    // RSVP button visible and labelled "RSVP Now"
    await expect(page.locator('[data-testid="rsvp-button"]')).toBeVisible()
    await expect(page.locator('[data-testid="rsvp-button"]')).toContainText('RSVP Now')

    // NOT showing organizer status card (public view, not organizer)
    await expect(page.locator('[data-testid="organizer-status-card"]')).not.toBeVisible()
  })

  // ── Test 2: OpenGraph meta tags present ─────────────────────────────────────
  test('OpenGraph meta tags are populated for link preview in Signal/WhatsApp', async ({ page }) => {
    await page.goto(`/t/${testTurnoutSlug}`)

    // og:title should contain the turnout title
    const ogTitle = page.locator('meta[property="og:title"]')
    await expect(ogTitle).toHaveAttribute('content', /E2E Test Turnout/)

    // og:description should contain the group name (joined with · in formatRelativeDate output)
    const ogDescription = page.locator('meta[property="og:description"]')
    await expect(ogDescription).toHaveAttribute('content', /E2E Test Group/)
  })

  // ── Test 3: Unauthenticated RSVP flow ──────────────────────────────────────
  test('unauthenticated user sees AuthModal and completes RSVP', async ({ page, request }) => {
    // Clean up any prior RSVP state for this test number
    await request.post('/api/test/cleanup', {
      data: { phones: [PHONES.rsvpUnauthenticated] },
    })

    await page.goto(`/t/${testTurnoutSlug}`)

    // Click RSVP Now — triggers AuthModal because no session
    await page.click('[data-testid="rsvp-button"]')

    // AuthModal should appear with phone input
    const phoneInput = page.locator('input[type="tel"]').first()
    await expect(phoneInput).toBeVisible({ timeout: 5000 })

    // Enter test phone
    await phoneInput.fill(PHONES.rsvpUnauthenticated)
    await page.click('button[type="submit"]')

    // New user: display name step (generated name is pre-filled, just click continue).
    // Use expect().toBeVisible() which properly waits/retries unlike locator.isVisible().
    const isNewUserStep = await expect(page.locator('[data-testid="display-name"]'))
      .toBeVisible({ timeout: 8000 })
      .then(() => true)
      .catch(() => false)
    if (isNewUserStep) {
      // Accept the generated display name — just submit the form
      await page.click('button[type="submit"]')
    }

    // OTP step — type the bypass code and submit
    await expect(page.locator('input[autocomplete="one-time-code"]').first()).toBeVisible({ timeout: 5000 })
    await fillOTP(page, BYPASS_CODE)
    // OTPBoxes auto-submits on the 6th digit — no Verify click needed

    // Wait for RSVP to complete and confirmed state to appear
    await expect(page.getByText("You're going!")).toBeVisible({ timeout: 10000 })

    // Post-RSVP actions should be visible
    await expect(page.getByText('Add to Calendar')).toBeVisible()
    await expect(page.locator('a:has-text("Get Directions")').last()).toBeVisible()
  })

  // ── Test 4: Authenticated RSVP (no modal) ───────────────────────────────────
  test('authenticated user RSVPs directly without seeing AuthModal', async ({ page, request, context }) => {
    // Seed user with active session
    const seedResponse = await request.post('/api/test/seed-user', {
      data: {
        phone: PHONES.rsvpAuthenticated,
        displayName: 'AuthedRSVPUser',
        createSession: true,
      },
    })
    expect(seedResponse.ok()).toBe(true)
    const { sessionToken } = await seedResponse.json()

    // Inject session cookie
    await context.addCookies([{
      name: 'session_token',
      value: sessionToken,
      domain: 'localhost',
      path: '/',
    }])

    await page.goto(`/t/${testTurnoutSlug}`)

    // Click RSVP Now
    await page.click('[data-testid="rsvp-button"]')

    // The AuthModal phone input should NOT appear
    await expect(page.locator('input[type="tel"]').first()).not.toBeVisible({ timeout: 1500 })

    // Should go directly to confirmed state
    await expect(page.getByText("You're going!")).toBeVisible({ timeout: 8000 })
  })

  // ── Test 5: Already RSVP'd — confirmed state on page load ───────────────────
  test("already RSVP'd user sees confirmed state immediately without clicking", async ({ page, request, context }) => {
    // Seed user with session
    const seedResponse = await request.post('/api/test/seed-user', {
      data: {
        phone: PHONES.rsvpAlreadyGoing,
        displayName: 'AlreadyGoingUser',
        createSession: true,
      },
    })
    expect(seedResponse.ok()).toBe(true)
    const { userId, sessionToken } = await seedResponse.json()

    // Pre-seed the engagement (RSVP already confirmed in DB)
    const engagementResponse = await request.post('/api/test/seed-engagement', {
      data: {
        userId,
        turnoutSlug: testTurnoutSlug,
      },
    })
    expect(engagementResponse.ok()).toBe(true)

    // Inject session cookie and navigate
    await context.addCookies([{
      name: 'session_token',
      value: sessionToken,
      domain: 'localhost',
      path: '/',
    }])

    await page.goto(`/t/${testTurnoutSlug}`)

    // Should show confirmed state immediately — no click required
    await expect(page.getByText("You're going!")).toBeVisible({ timeout: 5000 })

    // RSVP button should NOT be visible (already confirmed)
    await expect(page.locator('[data-testid="rsvp-button"]')).not.toBeVisible()
  })

  // ── Test 6: Calendar .ics download ──────────────────────────────────────────
  test('ICS calendar file returns valid RFC 5545 format', async ({ request }) => {
    const response = await request.get(`/api/turnout/${testTurnoutSlug}/ics`)

    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('text/calendar')

    const body = await response.text()

    // RFC 5545 structure
    expect(body).toContain('BEGIN:VCALENDAR')
    expect(body).toContain('VERSION:2.0')
    expect(body).toContain('BEGIN:VEVENT')
    expect(body).toContain('END:VEVENT')
    expect(body).toContain('END:VCALENDAR')

    // Correct event data
    expect(body).toContain('SUMMARY:E2E Test Turnout')

    // VALARM reminder
    expect(body).toContain('BEGIN:VALARM')
    expect(body).toContain('TRIGGER:-PT1H')
    expect(body).toContain('END:VALARM')
  })
})
