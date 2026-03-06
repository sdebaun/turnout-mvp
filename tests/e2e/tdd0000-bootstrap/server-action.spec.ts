import { test, expect } from '@playwright/test'

test('server action button is rendered and clickable', async ({ page }) => {
  await page.goto('/')

  const button = page.locator('button[type="submit"]:has-text("Test Server Action")')
  await expect(button).toBeVisible()
  await expect(button).toHaveText('Test Server Action')

  // Click and verify the Server Action actually executed —
  // the TestForm renders a success message with the timestamp on completion
  await button.click()
  await expect(page.getByText(/Server Action executed at/i)).toBeVisible()
})
