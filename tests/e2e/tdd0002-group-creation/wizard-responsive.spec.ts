import { test, expect } from '@playwright/test'

// Layout-only tests — no auth, no data creation.
// Navigate directly to step=1 which renders the preview zone.
// These verify the responsive sidebar layout introduced in the desktop design pass.

test.describe('wizard responsive layout', () => {
  test('desktop shows sidebar layout with form and preview side-by-side', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/organize?step=1')

    const preview = page.locator('[data-testid="wizard-preview"]')
    const form = page.locator('[data-testid="wizard-form"]')

    // Desktop preview sidebar is visible
    await expect(preview).toBeVisible()
    await expect(form).toBeVisible()

    // Preview starts to the right of the form (side-by-side, not stacked)
    const formBox = await form.boundingBox()
    const previewBox = await preview.boundingBox()

    expect(formBox).not.toBeNull()
    expect(previewBox).not.toBeNull()

    expect(previewBox!.x).toBeGreaterThan(formBox!.x + formBox!.width - 10)
  })

  test('mobile shows stacked layout with no sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 })
    await page.goto('/organize?step=1')

    // Desktop sidebar is hidden on mobile (hidden lg:flex)
    const desktopPreview = page.locator('[data-testid="wizard-preview"]')
    await expect(desktopPreview).not.toBeVisible()

    // Form is still visible
    const form = page.locator('[data-testid="wizard-form"]')
    await expect(form).toBeVisible()
  })

  test('pip indicator is inside the header, not floating below it', async ({ page }) => {
    await page.goto('/organize?step=1')

    const header = page.locator('[data-testid="wizard-header"]')
    const pip = page.locator('[data-testid="pip-indicator"]')

    await expect(header).toBeVisible()
    await expect(pip).toBeVisible()

    // Pip's bottom edge must be within the header's bounds (not below it)
    const headerBox = await header.boundingBox()
    const pipBox = await pip.boundingBox()

    expect(headerBox).not.toBeNull()
    expect(pipBox).not.toBeNull()

    const pipBottom = pipBox!.y + pipBox!.height
    const headerBottom = headerBox!.y + headerBox!.height

    expect(pipBottom).toBeLessThanOrEqual(headerBottom + 2) // +2 for sub-pixel rounding
  })

  test('action bar buttons are centered and not flush to viewport edges on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/organize?step=1')

    const backButton = page.locator('[data-testid="wizard-action-bar"] button').first()
    const continueButton = page.locator('[data-testid="wizard-action-bar"] button').last()

    await expect(backButton).toBeVisible()
    await expect(continueButton).toBeVisible()

    const backBox = await backButton.boundingBox()
    const continueBox = await continueButton.boundingBox()

    expect(backBox).not.toBeNull()
    expect(continueBox).not.toBeNull()

    // Back button should not be flush to the left viewport edge
    expect(backBox!.x).toBeGreaterThan(50)

    // Continue button right edge should not be flush to the right viewport edge
    const continueRight = continueBox!.x + continueBox!.width
    expect(continueRight).toBeLessThan(1280 - 50)
  })

  test('preview card has sharp corners on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/organize?step=1')

    const previewSidebar = page.locator('[data-testid="wizard-preview"]')
    await expect(previewSidebar).toBeVisible()

    // Scope to the sidebar's card — the mobile preview section also renders a card
    // but it's lg:hidden, and we want to evaluate the one that's actually shown.
    const previewCard = previewSidebar.locator('[data-testid="turnout-preview-card"]')
    await expect(previewCard).toBeVisible()

    // On desktop, lg:rounded-none overrides the mobile rounded-xl
    const borderRadius = await previewCard.evaluate(
      (el) => window.getComputedStyle(el).borderRadius
    )

    expect(borderRadius).toBe('0px')
  })
})
