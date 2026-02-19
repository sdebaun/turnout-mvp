/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app: (input) => ({
    name: "turnout",
    // retain resources on prod so a bad deploy doesn't nuke live data
    removal: input?.stage === "prod" ? "retain" : "remove",
    home: "aws",
  }),
  async run() {
    // Database URL from SST Secret (set via `sst secret set DatabaseUrl <value>`)
    const databaseUrl = new sst.Secret("DatabaseUrl")

    // Twilio secrets for phone-based auth (OTP via Verify API)
    const twilioAccountSid = new sst.Secret("TwilioAccountSid")
    const twilioAuthToken = new sst.Secret("TwilioAuthToken")
    const twilioVerifyServiceSid = new sst.Secret("TwilioVerifyServiceSid")
    const twilioVerifyTemplateSid = new sst.Secret("TwilioVerifyTemplateSid")
    const twilioTestSmsRecipientPhoneNumber = new sst.Secret("TwilioTestSmsRecipientPhoneNumber")

    // Custom domain only wired up for prod — dev stages use the auto-generated CloudFront URL
    const domain = $app.stage === "prod"
      ? {
          name: "turnout.network",
          redirects: ["www.turnout.network"],
          dns: sst.aws.dns({ zone: "Z05439171T4ND1GLJLT6S" }),
        }
      : undefined

    // Next.js app — linked to all secrets so Server Actions can call Twilio
    const web = new sst.aws.Nextjs("TurnoutWeb", {
      path: "./apps/web",
      link: [
        databaseUrl,
        twilioAccountSid,
        twilioAuthToken,
        twilioVerifyServiceSid,
        twilioVerifyTemplateSid,
        twilioTestSmsRecipientPhoneNumber,
      ],
      environment: {
        DATABASE_URL: databaseUrl.value,
        TWILIO_ACCOUNT_SID: twilioAccountSid.value,
        TWILIO_AUTH_TOKEN: twilioAuthToken.value,
        TWILIO_VERIFY_SERVICE_SID: twilioVerifyServiceSid.value,
        TWILIO_VERIFY_TEMPLATE_SID: twilioVerifyTemplateSid.value,
        TWILIO_TEST_SMS_RECIPIENT_PHONE_NUMBER: twilioTestSmsRecipientPhoneNumber.value,
      },
      domain,
      server: { runtime: "nodejs22.x" },
    })

    // Hello world cron job - runs every hour
    const helloCron = new sst.aws.Cron("HelloCron", {
      job: {
        runtime: "nodejs22.x",
        handler: "./apps/functions/src/hello-cron.handler",
        link: [databaseUrl],
        environment: {
          DATABASE_URL: databaseUrl.value,
          // Prisma can't find the engine binary in Lambda without help —
          // esbuild bundles the JS but not the native .so.node binary.
          PRISMA_QUERY_ENGINE_LIBRARY: "/var/task/libquery_engine-rhel-openssl-3.0.x.so.node",
        },
        copyFiles: [
          {
            from: "node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node",
            to: "libquery_engine-rhel-openssl-3.0.x.so.node",
          },
        ],
      },
      schedule: "rate(1 hour)",
    })

    // SMS delivery canary — sends a real OTP to the test number every 6 hours
    // to detect silent SMS delivery failures before users do.
    // Handler file created by sms-canary agent; deployment will fail until it exists.
    const smsDeliveryCanary = new sst.aws.Cron("SmsDeliveryCanary", {
      job: {
        runtime: "nodejs22.x",
        handler: "./apps/functions/src/sms-delivery-canary.handler",
        link: [
          twilioAccountSid,
          twilioAuthToken,
          twilioVerifyServiceSid,
          twilioVerifyTemplateSid,
          twilioTestSmsRecipientPhoneNumber,
        ],
        environment: {
          TWILIO_ACCOUNT_SID: twilioAccountSid.value,
          TWILIO_AUTH_TOKEN: twilioAuthToken.value,
          TWILIO_VERIFY_SERVICE_SID: twilioVerifyServiceSid.value,
          TWILIO_VERIFY_TEMPLATE_SID: twilioVerifyTemplateSid.value,
          TWILIO_TEST_SMS_RECIPIENT_PHONE_NUMBER: twilioTestSmsRecipientPhoneNumber.value,
          PRISMA_QUERY_ENGINE_LIBRARY: "/var/task/libquery_engine-rhel-openssl-3.0.x.so.node",
        },
        copyFiles: [
          {
            from: "node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node",
            to: "libquery_engine-rhel-openssl-3.0.x.so.node",
          },
        ],
        timeout: "60 seconds",
      },
      schedule: "rate(6 hours)",
    })

    return {
      web: web.url,
      cron: helloCron.name,
      canary: smsDeliveryCanary.name,
    }
  },
})
