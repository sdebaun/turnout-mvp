import { test, expect } from '@playwright/test'

// TEST_OTP_BYPASS must be set in the Next.js server env for the bypass code to work.
const BYPASS_CODE = '000000'

// NANP 555-01XX reserved test range — unique per test to avoid interference.
const PHONES = {
  newOrganizer: '+12025550110',
  authedOrganizer: '+12025550111',
}

// Future date for turnout creation (well into the future so tests don't time-bomb)
const FUTURE_DATE = '2027-07-15'
const FUTURE_TIME = '18:00'

// Helper: fill the location input.
// In CI (no NEXT_PUBLIC_GOOGLE_MAPS_API_KEY), the component renders a plain text
// input — we fill it directly. No autocomplete suggestions to click.
async function fillLocation(page: import('@playwright/test').Page, searchText: string) {
  await page.locator('[data-testid="location-input"]').fill(searchText)
}

test.describe('group & turnout creation (TDD0002)', () => {
  test.skip(!process.env.TEST_OTP_BYPASS, 'TEST_OTP_BYPASS not set')

  // Track slugs created during tests for cleanup
  let createdSlugs: string[] = []

  test.afterEach(async ({ request }) => {
    // Clean up any turnouts created during this test
    if (createdSlugs.length > 0) {
      await request.post('/api/test/cleanup', {
        data: { slugs: createdSlugs },
      })
      createdSlugs = []
    }
  })

  test('full creation flow (unauthenticated user)', async ({ page, request }) => {
    // Clean up any prior data for this phone
    await request.post('/api/test/cleanup', {
      data: { phones: [PHONES.newOrganizer] },
    })

    await page.goto('/organize')

    // Assert reassurance copy is visible — Bob needs this
    await expect(page.locator('text=you can change everything later')).toBeVisible()

    // Assert NO phone or display name fields on the form (auth is modal-based)
    await expect(page.locator('input[type="tel"]')).not.toBeVisible()
    await expect(page.locator('text=What should we call you?')).not.toBeVisible()

    // Fill the form — Section 1: Vision
    await page.fill('#mission', 'Stop the gravel mine from destroying Willow Creek')
    await page.fill('#groupName', 'Save Willow Creek')

    // Section 2: Action — turnoutTitle is pre-filled but let's verify and change it
    const titleInput = page.locator('#turnoutTitle')
    await expect(titleInput).toHaveValue('First Planning Meeting')

    await fillLocation(page, 'Empire State Building')

    // Set future date and time
    await page.fill('#turnoutDate', FUTURE_DATE)
    await page.fill('#turnoutTime', FUTURE_TIME)

    // Submit the form
    await page.click('button:text("Create Turnout")')

    // AuthModal should open since user is not authenticated
    await expect(page.locator('text=Before we make this official')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('input[type="tel"]')).toBeVisible()

    // Fill phone number
    await page.fill('input[type="tel"]', PHONES.newOrganizer)
    await page.click('button:text("Continue")')

    // New user → display name step
    await expect(page.locator('text=What should we call you?')).toBeVisible({ timeout: 10000 })
    await page.click('button:text("Continue")')

    // OTP step
    await expect(page.locator('text=Enter the 6-digit code')).toBeVisible({ timeout: 10000 })
    await page.fill('input[autocomplete="one-time-code"]', BYPASS_CODE)
    await page.click('button:text("Verify")')

    // Should redirect to /t/[slug]
    await page.waitForURL(/\/t\/[a-z0-9]+/, { timeout: 15000 })

    // Organizer view assertions
    await expect(page.locator('text=Your turnout is live!')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="invite-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="invite-message"]')).toContainText('Save Willow Creek')
    await expect(page.locator('[data-testid="copy-invite-button"]')).toBeVisible()

    // Extract slug for cleanup
    const url = page.url()
    const slug = url.split('/t/')[1]
    if (slug) createdSlugs.push(slug)

    // Also clean up the user
    await request.post('/api/test/cleanup', {
      data: { phones: [PHONES.newOrganizer] },
    })
  })

  test('creation as authenticated user (no auth modal)', async ({ page, request, context }) => {
    // Seed user with session
    const seedResponse = await request.post('/api/test/seed-user', {
      data: { phone: PHONES.authedOrganizer, displayName: 'AuthedOrganizer', createSession: true },
    })
    expect(seedResponse.ok()).toBe(true)

    const { sessionToken } = await seedResponse.json()

    // Set session cookie before navigating
    await context.addCookies([{
      name: 'session_token',
      value: sessionToken,
      domain: 'localhost',
      path: '/',
    }])

    await page.goto('/organize')

    // No auth fields on form
    await expect(page.locator('input[type="tel"]')).not.toBeVisible()

    // Fill the form
    await page.fill('#mission', 'Community garden for the neighborhood')
    await page.fill('#groupName', 'Green Block Initiative')

    await fillLocation(page, 'Central Park')

    await page.fill('#turnoutDate', FUTURE_DATE)
    await page.fill('#turnoutTime', FUTURE_TIME)

    // Submit — should NOT open AuthModal
    await page.click('button:text("Create Turnout")')

    // Auth modal should not appear
    await expect(page.locator('text=Before we make this official')).not.toBeVisible()

    // Should redirect directly to /t/[slug]
    await page.waitForURL(/\/t\/[a-z0-9]+/, { timeout: 15000 })

    // Extract slug for cleanup
    const url = page.url()
    const slug = url.split('/t/')[1]
    if (slug) createdSlugs.push(slug)

    // Clean up user
    await request.post('/api/test/cleanup', {
      data: { phones: [PHONES.authedOrganizer] },
    })
  })

  test('validation errors prevent submission', async ({ page }) => {
    await page.goto('/organize')

    // Click submit without filling anything
    await page.click('button:text("Create Turnout")')

    // Should show validation errors
    await expect(page.locator('text=Mission is required')).toBeVisible()
    await expect(page.locator('text=Group name is required')).toBeVisible()

    // Should still be on /organize
    expect(page.url()).toContain('/organize')

    // AuthModal should NOT have opened
    await expect(page.locator('text=Before we make this official')).not.toBeVisible()
  })

  test('past date rejected', async ({ page }) => {
    await page.goto('/organize')

    // Fill required fields
    await page.fill('#mission', 'Test mission')
    await page.fill('#groupName', 'Test group')

    await fillLocation(page, 'Times Square')

    // Set a date in the past
    await page.fill('#turnoutDate', '2020-01-01')
    await page.fill('#turnoutTime', '12:00')

    // Submit
    await page.click('button:text("Create Turnout")')

    // Should show date error
    await expect(page.locator('text=Turnout date must be in the future')).toBeVisible()

    // Should still be on /organize
    expect(page.url()).toContain('/organize')
  })
})
