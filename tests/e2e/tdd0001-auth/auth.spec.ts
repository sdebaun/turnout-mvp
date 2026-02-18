import { test, expect } from '@playwright/test'

// These tests require TEST_OTP_BYPASS=true in the Next.js server environment.
// In CI, set it in the env. Locally, add TEST_OTP_BYPASS=true to .env.local.
const BYPASS_CODE = '000000'

// Each test uses a unique phone to prevent cross-test interference.
// All phones are in the NANP 555-01XX reserved test range.
const PHONES = {
  newUser: '+12025550100',
  returningUser: '+12025550101',
  invalidCode: '+12025550102',
  rateLimit: '+12025550103',
}

test.describe('auth flow (OTP bypass mode)', () => {
  // Skip all tests if bypass is not enabled
  test.skip(!process.env.TEST_OTP_BYPASS, 'TEST_OTP_BYPASS not set')

  test.beforeEach(async ({ page, request }) => {
    // Clean up all test phone numbers before each test — makes tests
    // idempotent even when sharing a persistent Neon DB across runs.
    await request.post('/api/test/cleanup', {
      data: { phones: Object.values(PHONES) },
    })
    await page.goto('/')
  })

  test('new user: sign in flow creates session', async ({ page }) => {
    await page.click('text=Sign In / Sign Up')

    await page.fill('input[type="tel"]', PHONES.newUser)
    await page.click('button:text("Continue")')

    // New user → display name step
    await expect(page.locator('text=What should we call you?')).toBeVisible()

    // Accept the random name and continue
    await page.click('button:text("Continue")')

    // OTP step
    await expect(page.locator('text=Enter the 6-digit code')).toBeVisible()

    await page.fill('input[autocomplete="one-time-code"]', BYPASS_CODE)
    await page.click('button:text("Verify")')

    // Authenticated
    await expect(page.locator('text=Signed in as')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Logout')).toBeVisible()
  })

  test('returning user: sign in flow reuses existing user', async ({ page, request }) => {
    // Pre-seed user directly via test API — avoids OTP send and rate limit
    const seedResponse = await request.post('/api/test/seed-user', {
      data: { phone: PHONES.returningUser, displayName: 'ReturningTestUser' },
    })
    expect(seedResponse.ok()).toBe(true)

    // Sign in as returning user — should skip display name step
    await page.click('text=Sign In / Sign Up')
    await page.fill('input[type="tel"]', PHONES.returningUser)
    await page.click('button:text("Continue")')

    // Goes directly to OTP (no display name for returning users)
    await expect(page.locator('text=Enter the 6-digit code')).toBeVisible({ timeout: 10000 })

    await page.fill('input[autocomplete="one-time-code"]', BYPASS_CODE)
    await page.click('button:text("Verify")')

    await expect(page.locator('text=Signed in as')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=ReturningTestUser')).toBeVisible()
  })

  test('invalid code shows error message', async ({ page }) => {
    await page.click('text=Sign In / Sign Up')
    await page.fill('input[type="tel"]', PHONES.invalidCode)
    await page.click('button:text("Continue")')

    // New user → display name → OTP
    await expect(page.locator('text=What should we call you?')).toBeVisible()
    await page.click('button:text("Continue")')

    // Enter wrong code (bypass mode only accepts 000000)
    await page.fill('input[autocomplete="one-time-code"]', '999999')
    await page.click('button:text("Verify")')

    await expect(page.locator('text=Invalid verification code')).toBeVisible({ timeout: 10000 })
  })

  test('rate limit error shown on rapid resend', async ({ page }) => {
    await page.click('text=Sign In / Sign Up')
    await page.fill('input[type="tel"]', PHONES.rateLimit)
    await page.click('button:text("Continue")')

    // New user → display name step
    await expect(page.locator('text=What should we call you?')).toBeVisible()

    // This sends the first OTP and creates the rate limit record
    await page.click('button:text("Continue")')
    await expect(page.locator('text=Enter the 6-digit code')).toBeVisible({ timeout: 10000 })

    // Resend immediately — should trigger 60s rate limit
    await page.click('text=Resend')

    await expect(page.locator('text=wait 60 seconds')).toBeVisible({ timeout: 10000 })
  })
})
