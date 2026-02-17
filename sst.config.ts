/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app: (input) => ({
    name: "turnout",
    // NOTE: Using "staging" instead of "prod"/"production" due to SST bug
    // Stage names "prod", "production", "live" trigger Pulumi runtime error:
    // "TypeError: module_1.register is not a function"
    // This appears to be an SST v3.18.5 / Pulumi ts-node ESM initialization bug
    removal: input?.stage === "staging" ? "retain" : "remove",
    home: "aws",
  }),
  async run() {
    // Database URL from SST Secret (set via `sst secret set DatabaseUrl <value>`)
    const databaseUrl = new sst.Secret("DatabaseUrl")

    // Custom domain configuration (production only)
    // Using "staging" as production stage name (see comment above)
    const domain = $app.stage === "staging"
      ? {
          name: "turnout.network",
          redirects: ["www.turnout.network"],
          dns: { zone: "Z05439171T4ND1GLJLT6S" },
        }
      : undefined

    // Next.js app
    const web = new sst.aws.Nextjs("TurnoutWeb", {
      path: "./apps/web",
      link: [databaseUrl],
      environment: {
        DATABASE_URL: databaseUrl.value,
      },
      domain,
    })

    // Hello world cron job - runs every hour
    const helloCron = new sst.aws.Cron("HelloCron", {
      job: {
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

    return {
      web: web.url,
      cron: helloCron.name,
    }
  },
})
