import { test, expect } from '@playwright/test'
import { fillOTP } from '../helpers/otp'

// These tests require TEST_OTP_BYPASS=true in the Next.js server environment.
// In CI, set it in the env. Locally, add TEST_OTP_BYPASS=true to .env.local.
const BYPASS_CODE = '000000'

// Phone ranges per project — prevents cross-project parallel races.
// All phones are in the NANP 555-01XX reserved test range.
// Chromium: 100-103, Mobile: 104-107
const PHONES_BY_PROJECT: Record<string, { newUser: string; returningUser: string; invalidCode: string; rateLimit: string }> = {
  chromium: {
    newUser: '+12025550100',
    returningUser: '+12025550101',
    invalidCode: '+12025550102',
    rateLimit: '+12025550103',
  },
  mobile: {
    newUser: '+12025550104',
    returningUser: '+12025550105',
    invalidCode: '+12025550106',
    rateLimit: '+12025550107',
  },
}

// Serial within each project: tests share phone numbers so cleanup must not
// interleave with other tests' in-flight actions.
// Cleanup is scoped per-test to avoid cross-project parallel contamination —
// chromium's test2 cleanup used to nuke mobile's test1 mid-flight.
test.describe.serial('auth flow (OTP bypass mode)', () => {
  // Skip all tests if bypass is not enabled
  test.skip(!process.env.TEST_OTP_BYPASS, 'TEST_OTP_BYPASS not set')

  test('new user: sign in flow creates session', async ({ page, request }, testInfo) => {
    const PHONES = PHONES_BY_PROJECT[testInfo.project.name] ?? PHONES_BY_PROJECT.chromium
    await request.post('/api/test/cleanup', { data: { phones: [PHONES.newUser] } })
    await page.goto('/')
    await page.click('text=Sign in')

    await page.fill('input[type="tel"]', PHONES.newUser)
    await page.click('button:text("Continue")')

    // New user → display name step
    await expect(page.locator('text=What should we call you?')).toBeVisible()

    // Accept the random name and continue
    await page.click('button:text("Continue")')

    // OTP step
    await expect(page.locator('text=We sent a 6-digit code')).toBeVisible()

    await fillOTP(page, BYPASS_CODE)

    // After OTP, the modal calls router.refresh() which re-renders the nav.
    // Wait for "Sign in" to disappear first (fast), then avatar to appear (needs server re-render).
    await expect(page.locator('button[aria-label="Account menu"]')).toBeVisible({ timeout: 20000 })
    await page.click('button[aria-label="Account menu"]')
    // "Sign out" is only in the nav dropdown, not elsewhere on the page
    await expect(page.locator('text=Sign out')).toBeVisible()
  })

  test('returning user: sign in flow reuses existing user', async ({ page, request }, testInfo) => {
    const PHONES = PHONES_BY_PROJECT[testInfo.project.name] ?? PHONES_BY_PROJECT.chromium
    await request.post('/api/test/cleanup', { data: { phones: [PHONES.returningUser] } })
    await page.goto('/')

    // Pre-seed user directly via test API — avoids OTP send and rate limit.
    const seedResponse = await request.post('/api/test/seed-user', {
      data: { phone: PHONES.returningUser, displayName: 'ReturningTestUser' },
    })
    expect(seedResponse.ok()).toBe(true)

    // Sign in as returning user — should skip display name step
    await page.click('text=Sign in')
    await page.fill('input[type="tel"]', PHONES.returningUser)
    await page.click('button:text("Continue")')

    // Goes directly to OTP (no display name for returning users)
    await expect(page.locator('text=We sent a 6-digit code')).toBeVisible({ timeout: 10000 })

    await fillOTP(page, BYPASS_CODE)

    // Authenticated — avatar button appears in nav only when session is active
    await expect(page.locator('button[aria-label="Account menu"]')).toBeVisible({ timeout: 15000 })
    await page.click('button[aria-label="Account menu"]')
    // Name appears in the dropdown (scoped to nav to avoid matching AuthSection)
    await expect(page.locator('nav').getByText('ReturningTestUser')).toBeVisible()
  })

  test('invalid code shows error message', async ({ page, request }, testInfo) => {
    const PHONES = PHONES_BY_PROJECT[testInfo.project.name] ?? PHONES_BY_PROJECT.chromium
    await request.post('/api/test/cleanup', { data: { phones: [PHONES.invalidCode] } })
    await page.goto('/')
    await page.click('text=Sign in')
    await page.fill('input[type="tel"]', PHONES.invalidCode)
    await page.click('button:text("Continue")')

    // New user → display name → OTP
    await expect(page.locator('text=What should we call you?')).toBeVisible()
    await page.click('button:text("Continue")')

    // Enter wrong code (bypass mode only accepts 000000) — auto-submits on 6th digit
    await fillOTP(page, '999999')

    await expect(page.locator('text=Invalid verification code')).toBeVisible({ timeout: 10000 })
  })

  test('rate limit error shown on rapid resend', async ({ page, request }, testInfo) => {
    const PHONES = PHONES_BY_PROJECT[testInfo.project.name] ?? PHONES_BY_PROJECT.chromium
    await request.post('/api/test/cleanup', { data: { phones: [PHONES.rateLimit] } })
    await page.goto('/')
    await page.click('text=Sign in')
    await page.fill('input[type="tel"]', PHONES.rateLimit)
    await page.click('button:text("Continue")')

    // New user → display name step
    await expect(page.locator('text=What should we call you?')).toBeVisible()

    // This sends the first OTP and creates the rate limit record
    await page.click('button:text("Continue")')
    await expect(page.locator('text=We sent a 6-digit code')).toBeVisible({ timeout: 10000 })

    // Resend immediately — should trigger 60s rate limit
    await page.click('text=Resend')

    await expect(page.locator('text=wait 60 seconds')).toBeVisible({ timeout: 10000 })
  })
})
