import { test, expect } from '@playwright/test'

test('server action button is rendered and clickable', async ({ page }) => {
  await page.goto('/')

  const button = page.locator('button[type="submit"]')
  await expect(button).toBeVisible()
  await expect(button).toHaveText('Test Server Action')

  // Click to prove Server Actions work end-to-end
  await button.click()
  // Server Action logs to console server-side, doesn't change UI for bootstrap
  // Real features will have observable UI changes to test
})
