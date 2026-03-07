import { defineConfig, devices } from '@playwright/test'

// Mirror the flag that .env.local sets for the Next.js server so that
// test.skip(!process.env.TEST_OTP_BYPASS) guards in spec files work correctly.
// The server reads it from .env.local; the test process needs it explicitly.
process.env.TEST_OTP_BYPASS = 'true'

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
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'pnpm --filter @turnout/web dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
