import type Twilio from 'twilio'

/**
 * Polls the Twilio Messages API for an SMS delivered to the test number.
 * Designed for E2E tests and the delivery canary — not production code.
 *
 * Why polling: Twilio doesn't push inbound message content back to us
 * synchronously. We have to ask "did anything arrive?" until it does
 * or we give up. The alternative (webhooks) requires a reachable URL,
 * which Lambda cron and test runners don't have.
 */
export async function waitForSms(opts: {
  client: Twilio.Twilio
  to: string
  after: Date
  timeoutMs?: number
  pollIntervalMs?: number
}): Promise<string> {
  const {
    client,
    to,
    after,
    timeoutMs = 30_000,
    pollIntervalMs = 2_000,
  } = opts

  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const messages = await client.messages.list({ to })

    // Find the first message that arrived after our "before" timestamp.
    // Twilio returns messages newest-first by default.
    const match = messages.find(
      (msg) => msg.dateCreated && msg.dateCreated > after
    )

    if (match) {
      const code = parseOtpCode(match.body)
      if (code) return code
    }

    // Not yet — wait and try again
    await sleep(pollIntervalMs)
  }

  throw new Error(
    `waitForSms timed out after ${timeoutMs}ms waiting for SMS to ${to}`
  )
}

/**
 * Extracts a 6-digit OTP code from the Twilio Verify template format:
 * "123456 is your turnout.network verification code. @turnout.network #123456"
 *
 * The leading digits are the code. The trailing #123456 is the WebOTP
 * binding hint (for browser autofill), not a separate code.
 */
function parseOtpCode(body: string): string | null {
  const match = body.match(/^(\d{4,10})\s/)
  return match ? match[1] : null
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
