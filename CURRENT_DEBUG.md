# CURRENT DEBUG SESSION
**Status:** RESOLVED
**Date:** 2026-02-16

## PROBLEM STATEMENT
Second `sst deploy` was failing with what appeared to be a Bun/Pulumi `module.register()` incompatibility.

## ROOT CAUSE (ACTUAL)
**The problem was NOT a Bun/Pulumi issue.**

The Prisma client was never generated after initial `pnpm install`. When SST attempted to deploy:
1. Next.js build failed: `Module '"@prisma/client"' has no exported member 'PrismaClient'`
2. Lambda bundler failed: `ENOENT: no such file or directory, stat '...libquery_engine-rhel-openssl-3.0.x.so.node'`

## SOLUTION
Run `pnpm prisma generate` before deploying:
```bash
pnpm prisma generate
sst deploy --stage sdebaun
```

## VERIFICATION
Deployment completed successfully:
- TurnoutWeb: https://dc0vs75flf2mn.cloudfront.net
- HelloCron: Deployed
- All Lambda functions created
- CloudFront distribution deployed

## WHY THIS WAS CONFUSING
The initial successful deploy (from the bootstrap PR) likely worked because:
1. Prisma generate ran as part of the initial setup
2. Or the first deploy somehow triggered client generation
3. The second deploy assumed client was already generated

The error logs showed Pulumi/SST stack traces, which made it look like an infrastructure issue rather than a missing build step.

## LESSON LEARNED
Always check that code-generation tools (Prisma, GraphQL codegen, etc.) have run before deployment. The error appeared deep in the infrastructure layer but was actually a missing prerequisite at the application layer.

## PREVENTION ADDED ✅
Added `postinstall` hook to package.json:
```json
"scripts": {
  "postinstall": "prisma generate"
}
```

This ensures `prisma generate` runs automatically after every `pnpm install`, preventing this issue from recurring.

## NEXT STEPS
- Test the live site: verify Server Actions work with Neon DB
- Update DEVELOPMENT.md with deployment prerequisites
- Consider deleting CURRENT_DEBUG.md (or keep as cautionary tale about debugging red herrings)
