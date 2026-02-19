import twilio from 'twilio'
import { waitForSms } from '@/lib/test-helpers/wait-for-sms'
import { logger } from '@/lib/logger'

/**
 * SMS Delivery Canary — runs on a cron schedule (every 6 hours).
 *
 * Sends a real OTP to our dedicated test phone number, polls for delivery,
 * then verifies the code end-to-end. If any step fails, the Lambda errors
 * and CloudWatch alarm fires — we know before users do.
 *
 * What this catches: Twilio API outages, carrier filtering, template
 * breakage, delivery latency spikes. The kind of silent failures that
 * make you look like an idiot at 3 AM.
 */
export async function handler() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!
  const authToken = process.env.TWILIO_AUTH_TOKEN!
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID!
  const templateSid = process.env.TWILIO_VERIFY_TEMPLATE_SID!
  const testNumber = process.env.TWILIO_TEST_SMS_RECIPIENT_PHONE_NUMBER!

  const client = twilio(accountSid, authToken)
  const before = new Date()

  // Step 1: Send OTP to the test number via Verify API
  await client.verify.v2
    .services(serviceSid)
    .verifications.create({
      to: testNumber,
      channel: 'sms',
      templateSid,
    })

  // Step 2: Poll for SMS delivery — Twilio Messages API
  const code = await waitForSms({
    client,
    to: testNumber,
    after: before,
    timeoutMs: 45_000, // generous timeout — SMS can be slow
  })

  // Step 3: Verify the code we received matches what Twilio sent
  const check = await client.verify.v2
    .services(serviceSid)
    .verificationChecks.create({
      to: testNumber,
      code,
    })

  if (check.status !== 'approved') {
    throw new Error(`Canary verification failed: status=${check.status}`)
  }

  logger.info({ timestamp: new Date().toISOString() }, 'Canary check passed')

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, timestamp: new Date().toISOString() }),
  }
}
