/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app: (input) => ({
    name: "turnout",
    removal: input?.stage === "production" ? "retain" : "remove",
    home: "aws",
  }),
  async run() {
    // Database URL from SST Secret (set via `sst secret set DatabaseUrl <value>`)
    const databaseUrl = new sst.Secret("DatabaseUrl")

    // Next.js app
    const web = new sst.aws.Nextjs("TurnoutWeb", {
      path: "./apps/web",
      link: [databaseUrl],
      environment: {
        DATABASE_URL: databaseUrl.value,
      },
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
