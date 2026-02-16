import { test, expect } from '@playwright/test'

test('homepage loads and displays hello message', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('h1')).toHaveText('Hello Turnout')
  await expect(page.locator('text=Bootstrap successful!')).toBeVisible()
})
