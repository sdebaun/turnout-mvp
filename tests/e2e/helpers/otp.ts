import { expect, type Page } from '@playwright/test'

/**
 * Fill the OTPBoxes component by typing one digit at a time.
 *
 * OTPBoxes advances focus automatically on each digit input, and auto-submits
 * the parent form when the 6th digit is entered. Do NOT click "Verify" after
 * calling this — the form is already in flight.
 */
export async function fillOTP(page: Page, code: string) {
  const firstBox = page.locator('input[autocomplete="one-time-code"]').first()
  await expect(firstBox).toBeVisible({ timeout: 5000 })
  await firstBox.focus()
  for (const digit of code) {
    await page.keyboard.type(digit)
  }
}
