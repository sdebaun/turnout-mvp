# TDD0000a: Production Domain Deployment

**PRD:** N/A (Infrastructure - extends TDD0000)
**Status:** In Progress (DNS propagation complete, ready for Phase 5: SST config)
**Last Updated:** 2026-02-17

**Current Progress:**
- ✅ Phase 2: Route53 hosted zone created
- ✅ Phase 3: Nameservers updated at Gandi
- ✅ Phase 4: DNS propagation complete (verified 2026-02-17 via `dig NS turnout.network`)
- ⏭️ Next: Phase 5 (SST config) and Phase 6 (production deployment)

## Context

**What I found:**

- **Previous work:** TDD0000 established infrastructure deploying to AWS via SST. TDD0000 explicitly excluded production deployment (dev stages only). **This TDD handles the first production deployment** in addition to configuring the custom domain.
- **Vision alignment:** Production deployment to real domain is prerequisite for any public usage.
- **Roadmap phase:** Pre-MVP (blocks public testing)
- **Architecture constraints:**
  - SST (Ion) on AWS (CloudFront + Lambda@Edge)
  - Infrastructure as Code (all config in `sst.config.ts`)
  - Domain registered at Gandi (turnout.network) - **registration stays at Gandi, DNS moves to Route53**

---

## Overview

**Problem:** The production stage deploys to `https://d1234abcd.cloudfront.net` URLs. We own turnout.network but it's not connected. Users can't visit the actual domain.

**Solution:** Configure SST to deploy Next.js app to turnout.network in production. SST creates Route53 hosted zone and ACM certificate (covering both apex and www) automatically. www.turnout.network redirects to apex. We update nameservers at Gandi to point to Route53. Domain registration stays at Gandi.

**Scope:**

**In scope:**

- SSL certificate for turnout.network and www.turnout.network (via ACM, automated by SST)
- Route53 hosted zone (created by SST)
- www.turnout.network redirect to apex (301 permanent redirect)
- SST config changes to enable custom domain on production stage
- Nameserver update at Gandi (point to Route53)
- Verification that both apex and www work
- Documentation of domain setup for future reference

**Out of scope:**

- Custom domains for dev stages (personal stages stay on auto-generated URLs)
- Other subdomains (api.turnout.network, etc.) - not needed for MVP
- Email hosting or other DNS records
- CDN configuration beyond SST defaults
- Migrating domain registration from Gandi to Route53 (domain stays registered at Gandi)

---

## Migration Approach

**This TDD uses AWS's "Inactive Domain" DNS migration procedure.**

This is appropriate because:

- First production deployment (domain has never served turnout.network)
- No existing traffic to disrupt
- No users yet (pre-MVP)
- Simplified 4-step process vs. 11-step active domain procedure

**If your domain IS receiving traffic:** You need AWS's "Active Domain" procedure instead, which includes:

- Lowering TTL to 60-900 seconds at current DNS provider
- Waiting ~2 days for old TTL to expire
- Monitoring traffic after migration and rolling back if issues occur
- Restoring TTL to normal values after successful migration
- See: [Making Route 53 the DNS service for a domain that's in use](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/migrate-dns-domain-in-use.html)

**Reference:** [Making Route 53 the DNS service for an inactive domain](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/migrate-dns-domain-inactive.html)

---

## Success Criteria

After this TDD is implemented:

1. Visit https://turnout.network in browser → See "Hello Turnout" page
2. Visit https://www.turnout.network → Redirects to apex domain
3. SSL certificate is valid for both apex and www (no browser warnings)
4. Production deployment uses custom domain (not CloudFront URL)
5. Dev stages still work with auto-generated URLs
6. Production deployment is repeatable via `pnpm prod:deploy`
7. Domain remains registered at Gandi (only nameservers changed)

---

## Components

**What this touches:**

- [x] SST configuration (add custom domain)
- [x] Deployment scripts (make production explicit, prevent accidents)
- [x] AWS Certificate Manager (SSL cert - automated by SST)
- [x] Route53 (hosted zone - automated by SST)
- [x] DNS nameservers at Gandi (manual human step)
- [ ] Database (no changes)
- [ ] Application code (no changes)
- [ ] Tests (no changes - domain mapping is infrastructure)

---

## Prerequisites

**🧑 HUMAN REQUIRED:**

### 1. Production Database Secret

**Before deploying to production, you MUST set the DatabaseUrl secret for the production stage.**

If not already done, create a Neon database for production and set the secret:

```bash
# 1. Create production database at neon.tech
# 2. Copy the connection string
# 3. Set the secret:
sst secret set DatabaseUrl "postgresql://user:pass@ep-xxx.neon.tech/turnoutdb?sslmode=require" --stage prod
```

**Verify it's set:**

```bash
sst secret list --stage prod
# Should show: DatabaseUrl
```

**Without this secret, production deployment will fail.** TDD0000 covered dev stage setup, but production database wasn't created yet.

**After setting the secret, run the initial migration:**

```bash
sst shell --stage prod -- pnpm prisma migrate deploy
```

This creates the database schema in production. Without this step, the deployed app will crash on any database query.

---

### 2. Domain Access at Gandi

You must have admin access to turnout.network at Gandi. You'll need to update nameservers (steps provided in Phase 2).

**Note:** Domain registration stays at Gandi. We're only changing nameservers to Route53. You'll still renew the domain at Gandi, manage registration there, etc.

---

### 3. AWS Permissions

Your AWS credentials must have permission to:

- Create ACM certificates
- Create Route53 hosted zones
- Modify CloudFront distributions

Verify: `aws sts get-caller-identity` returns your account.

---

### 4. Domain Already Registered

Verify you own turnout.network:

```bash
whois turnout.network | grep -i registrar
# Should show Gandi
```

---

### 5. Check for DNSSEC Configuration

✅ **VERIFIED (2026-02-17): DNSSEC is Inactive at Gandi**

This prerequisite has already been verified. DNSSEC is not enabled on turnout.network. You can skip this check and proceed to Phase 0.

---

## Implementation Steps

### Phase 0: Verify Prerequisites

**1. Verify production DatabaseUrl secret is set:**

```bash
sst secret list --stage prod | grep DatabaseUrl
```

**If not set:** Stop and complete the "Production Database Secret" prerequisite above.

---

**2. Verify TDD0000 dev deployment works:**

```bash
# Deploy to your dev stage
pnpm sst deploy --stage $USER

# Get the URL
DEV_URL=$(sst output --stage $USER web.url)
echo "Dev stage URL: $DEV_URL"

# Verify it works
curl -I "$DEV_URL"
# Should return HTTP 200
```

**If this fails:** Complete TDD0000 first before proceeding.

---

### Phase 1: Fix Deployment Scripts (Safety)

**Problem from TDD0000:** The `deploy` script goes straight to production. This is dangerous - one typo and you nuke prod.

**Solution:** Make personal stage the default, production explicit.

**Update these two scripts in root `package.json`:**

```diff
- "deploy": "sst deploy --stage prod",
+ "deploy": "sst deploy --stage ${SST_STAGE:-$USER}",
+ "prod:deploy": "sst deploy --stage prod",
```

**Important:** Only change these two lines. Do NOT replace the entire scripts section - that will delete other scripts like `postinstall: "prisma generate"` which are required for the project to work.

**Key changes:**

- `deploy` now deploys to personal stage (safe default)
- `prod:deploy` explicitly deploys to production (requires intent)
- This supersedes TDD0000's deployment script setup

**Why this matters:**

- Agent teams can safely deploy to test their work without risking production
- Production deployments require explicit `pnpm prod:deploy` command
- No more "oops I deployed half-finished code to prod"

**⚠️ Safety Note:** All these scripts use `${SST_STAGE:-$USER}` which respects the `SST_STAGE` environment variable. If you (or an agent) set `SST_STAGE=prod` in your shell and forget to unset it, `pnpm deploy` will deploy to production, defeating the safety mechanism. Keep `SST_STAGE` unset during normal development.

**Commit the change:**

```bash
git add package.json
git commit -m "fix(scripts): make production deployment explicit

Change deployment scripts to prevent accidental production deploys:
- 'pnpm deploy' → personal stage (safe default)
- 'pnpm prod:deploy' → production (explicit)

Supersedes TDD0000 deployment script setup.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Phase 2: Create Route53 Hosted Zone

**🧑 HUMAN REQUIRED:**

Create the Route53 hosted zone manually in AWS Console. This lets us get nameservers before any deployment.

**Steps:**

1. Open [AWS Route53 Console](https://console.aws.amazon.com/route53/)
2. Click **Hosted zones** in the left navigation
3. Click **Create hosted zone**
4. Enter domain name: `turnout.network`
5. Type: **Public hosted zone**
6. Click **Create hosted zone**

**Get the nameservers immediately:**

After creation, the hosted zone details page shows 4 nameservers in the **Name servers** section. They look like:

```
ns-123.awsdns-12.com
ns-456.awsdns-34.net
ns-789.awsdns-56.org
ns-012.awsdns-78.co.uk
```

**Save these nameservers AND the Zone ID** (format: `Z1234ABCD5678EF`) - you'll need both.

**Verify Phase 2:**

- [x] Route53 hosted zone created for turnout.network
- [x] Got 4 AWS nameservers (in `awsdns-*.com/net/org/co.uk` format)
- [x] Saved the Zone ID (starts with Z)

---

### Phase 3: Update Nameservers at Gandi

**🧑 HUMAN REQUIRED:**

**Important:** Domain registration stays at Gandi. You'll still renew at Gandi, manage WHOIS there, etc. We're only changing nameservers.

**Before changing nameservers:** If you have ANY existing DNS records at Gandi (MX records for email, TXT records for domain verification, etc.), export them first. You'll need to recreate them in Route53 after the switch.

**Steps:**

1. Log in to Gandi.net
2. Go to domain management for turnout.network
3. Check for existing DNS records and export if any exist
4. Find the "Nameservers" section (sometimes called "DNS" or "Name Servers")
5. **SAVE the current Gandi nameservers** (write them down, screenshot, or copy to a text file)
   - You'll need these for rollback if something goes wrong
   - Typical Gandi nameservers look like: `ns1.gandi.net`, `ns2.gandi.net`, etc.
6. Change from Gandi's nameservers to the AWS nameservers from Phase 2:
   - Remove existing Gandi nameservers
   - Add all 4 AWS nameservers
7. Save changes

**Note:** Nameserver propagation takes 5 minutes to 48 hours (usually <1 hour). During propagation, some users may hit Gandi (no records), some may hit Route53. For MVP with no users, this doesn't matter.

**Verify Phase 3:**

- [ ] Original Gandi nameservers saved (for rollback)
- [ ] Nameservers changed at Gandi to Route53 nameservers
- [ ] All 4 AWS nameservers added
- [ ] Existing DNS records exported (if any existed)

---

### Phase 4: Wait for DNS Propagation

**✅ DNS PROPAGATION COMPLETE (Verified 2026-02-17)**

Nameservers have successfully propagated and are now live at AWS Route53.

**Check propagation status:**

```bash
# Check if nameservers have propagated
dig NS turnout.network +short

# Shows AWS nameservers (propagation complete)
```

**If you need to verify:**

```bash
dig NS turnout.network +short
# Should show AWS Route53 nameservers in awsdns-*.com/net/org/co.uk format
```

**Verify Phase 4:**

- ✅ `dig NS turnout.network +short` shows AWS nameservers (COMPLETE)

---

### Phase 5: Update SST Configuration

**Configure SST to use the existing Route53 zone and turnout.network domain.**

**File:** `sst.config.ts`

**Requirements:**

- Domain only applies when `stage === "prod"`
- Reference the existing Route53 zone by ID (from Phase 2)
- Apex domain (turnout.network) is canonical
- www.turnout.network redirects to apex (301 permanent)
- Use `sst.aws.dns({ zone: "Z..." })` with the Zone ID from Phase 2
- SST will create ACM certificate for both apex and www
- Dev stages continue using auto-generated CloudFront URLs

**Commit the change:**

```bash
git add sst.config.ts
git commit -m "feat(infra): add production domain configuration

Configure turnout.network custom domain for production stage:
- Reference existing Route53 hosted zone
- SSL certificate via ACM (validates automatically)
- www.turnout.network redirects to apex
- Dev stages still use auto-generated URLs

Implements TDD0000a

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Phase 6: Deploy to Production

**Deploy with domain configuration. Certificate will validate successfully on first try.**

```bash
pnpm prod:deploy
```

**Note:** We're using `prod:deploy` (not `deploy`) because Phase 1 made production explicit.

**This deployment will succeed.** SST will:

- Use existing Route53 hosted zone (created in Phase 2)
- Create ACM certificate for turnout.network and www.turnout.network
- Add DNS validation records to Route53
- ACM validates certificate via public DNS (nameservers already point to Route53)
- Certificate status changes to ISSUED immediately
- CloudFront distribution configured with validated certificate
- Deployment completes successfully

**Expected output:**

```
✓ Complete
   web: https://turnout.network
   domain: https://turnout.network
   cron: turnout-prod-HelloCron
```

**If deployment fails with "DatabaseUrl secret not found":**

- You didn't complete the prerequisite
- Set the production DatabaseUrl secret AND run the migration (see Prerequisites section)
- Then try again

**If deployment fails with certificate validation:**

- Nameservers may not have fully propagated yet (check Phase 4)
- Wait another 10-15 minutes
- Check `dig NS turnout.network +short` - should show AWS nameservers
- Try deploying again

**Verify Phase 6:**

- [ ] Deployment exits with code 0 (success)
- [ ] Output shows `web: https://turnout.network`
- [ ] No certificate validation errors

---

### Phase 7: Verification

**1. Check DNS resolution:**

```bash
# Check if domain resolves to CloudFront
dig turnout.network

# Should return CloudFront IP addresses
```

---

**2. Check SSL certificate:**

```bash
# Verify HTTPS works
curl -I https://turnout.network

# Should return HTTP 200 or 30x redirect
# Should NOT return certificate errors
```

If you get certificate errors:

- Nameservers not fully propagated yet - wait longer
- Certificate validation still pending - wait 5-30 minutes

---

**3. Visit in browser:**

Open https://turnout.network in a browser.

**Expected:**

- See "Hello Turnout" page from TDD0000
- No SSL warnings
- URL bar shows "turnout.network" (not CloudFront domain)
- Valid SSL certificate (click the lock icon to verify)

**4. Test www redirect:**

```bash
# Test that www redirects to apex
curl -I https://www.turnout.network

# Should return HTTP 301 or 308 (permanent redirect)
# Location header should show: https://turnout.network
```

Open https://www.turnout.network in a browser.

**Expected:**

- Browser automatically redirects to https://turnout.network
- URL bar changes from www to apex
- Page loads normally

---

**5. Verify dev stages still work:**

```bash
# Deploy to your personal dev stage
pnpm sst deploy --stage $USER

# Should use auto-generated URL, not custom domain
DEV_URL=$(sst output --stage $USER web.url)
echo "Dev stage URL: $DEV_URL"

curl -I "$DEV_URL"
# Should return HTTP 200
```

**Verify the dev URL does NOT show turnout.network** - it should be a CloudFront or sst.sh URL.

---

**Verify Phase 7:**

- [ ] `dig NS turnout.network` shows AWS nameservers
- [ ] `dig turnout.network` resolves to CloudFront IPs
- [ ] `curl -I https://turnout.network` returns HTTP 200
- [ ] `curl -I https://www.turnout.network` returns HTTP 301/308 redirect
- [ ] Browser shows site with valid SSL certificate
- [ ] www.turnout.network redirects to apex in browser
- [ ] Dev stages still deploy to auto-generated URLs (not turnout.network)

---

### Phase 8: Documentation

**Update README.md with production deployment instructions.**

Add a section:

````markdown
## Production Deployment

The production stage deploys to https://turnout.network.

**Prerequisites:**

- Production DatabaseUrl secret set (see TDD0000 Neon setup)
- Route53 nameservers configured at Gandi (see TDD0000a)

**Deploy:**

```bash
pnpm prod:deploy
```
````

**Verify:**

- Visit https://turnout.network
- Should see the app with valid SSL

**Rollback:**
If deployment breaks production, rollback via:

```bash
git revert HEAD
pnpm prod:deploy
```

**Cache invalidation:**
CloudFront caches aggressively. If you see stale content after deployment:

```bash
aws cloudfront create-invalidation \
  --distribution-id $(aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items[?@=='turnout.network']].Id" --output text) \
  --paths "/*"
```

````

**Commit documentation:**

```bash
git add README.md
git commit -m "docs: add production deployment instructions

Document how to deploy to turnout.network:
- Prerequisites (Route53 DNS, SSL cert, Neon DB)
- Deployment command
- Verification steps
- Rollback and cache invalidation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
````

---

## Edge Cases & Error Handling

### DNS Propagation Takes Too Long

**Scenario:** Nameservers updated at Gandi but domain doesn't resolve after 2 hours.

**Solutions:**

1. Check nameservers actually changed: `dig NS turnout.network +short`
2. Check Gandi dashboard - verify nameservers saved correctly
3. Flush local DNS cache (commands in Phase 4)
4. Test from different network (mobile hotspot) to rule out ISP caching
5. Wait up to 48 hours (DNS propagation worst case, but usually <1 hour)

---

### Certificate Validation Fails During Deployment

**Scenario:** `pnpm prod:deploy` (Phase 6) fails with "Certificate validation failed" or times out.

**This should NOT happen** if you followed Phase 2-4 correctly (nameservers already point to Route53). If it does fail:

**Causes:**

1. **DNS propagation incomplete** - Nameservers haven't fully propagated yet
2. **Wrong Zone ID in SST config** - Verify you used the Zone ID from Phase 2
3. **Route53 zone deleted** - Zone was removed between Phase 2 and Phase 6

**Solutions:**

1. Check nameservers propagated: `dig NS turnout.network +short` should show AWS nameservers
2. If still showing Gandi nameservers, wait longer (can take up to 48 hours) and redeploy
3. Verify SST config references the correct Zone ID from Phase 2
4. Check ACM certificate status:
   ```bash
   aws acm list-certificates --region us-east-1 \
     --query "CertificateSummaryList[?DomainName=='turnout.network']"
   ```
5. If still PENDING_VALIDATION after nameservers propagated, wait 10-15 minutes and redeploy

---

### CloudFront Distribution Fails to Update

**Scenario:** `pnpm prod:deploy` fails with "Distribution already has CNAME turnout.network".

**Solutions:**

1. Another CloudFront distribution may have claimed the domain
2. Find conflicting distribution:
   ```bash
   aws cloudfront list-distributions \
     --query "DistributionList.Items[?Aliases.Items[?@=='turnout.network']].[Id,DomainName]" \
     --output table
   ```
3. If it's an old SST deployment, remove it: `sst remove --stage old-stage-name`
4. If it's not SST-managed, manually remove the CNAME from that distribution via AWS Console

---

### SSL Certificate Shows as Invalid in Browser

**Scenario:** Browser shows "Certificate does not match domain" warning.

**Solutions:**

1. Check certificate was issued for the right domain:
   ```bash
   aws acm list-certificates --region us-east-1 \
     --query "CertificateSummaryList[?DomainName=='turnout.network']"
   ```
2. Verify CloudFront is using the right cert:
   ```bash
   aws cloudfront get-distribution-config \
     --id $(aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items[?@=='turnout.network']].Id" --output text) \
     --query "DistributionConfig.ViewerCertificate.ACMCertificateArn"
   ```
3. If wrong cert, SST may have used an old one - try `sst remove --stage prod` and redeploy

---

### Production Deployment Fails with "DatabaseUrl not found"

**Scenario:** First production deploy fails because DatabaseUrl secret isn't set.

**Solutions:**

1. You skipped the prerequisite - set the production DatabaseUrl secret
2. See "Prerequisites → Production Database Secret" section above
3. Create Neon database for production
4. Set the secret: `sst secret set DatabaseUrl "<neon-url>" --stage prod`
5. Deploy again: `pnpm prod:deploy`

---

## Rollback Plan

**If production domain breaks and you need to revert:**

### Quick Fix: Remove Custom Domain

**IMPORTANT:** Revert nameservers FIRST, then remove the Route53 zone. Doing it in the wrong order causes DNS outage.

**1. Revert nameservers at Gandi:**
🧑 **HUMAN REQUIRED:**

- Log in to Gandi
- Go to domain management for turnout.network
- Change nameservers back to the original Gandi nameservers you saved in Phase 5
- If you didn't save them: typical Gandi defaults are `ns1.gandi.net`, `ns2.gandi.net`, `ns3.gandi.net`, etc.
- Save changes

**2. Wait for DNS propagation:**

```bash
# Check until nameservers revert
dig NS turnout.network +short
# Should show Gandi nameservers eventually
```

Wait at least 10-15 minutes (could take hours for full propagation).

**3. Revert SST config:**

```bash
git revert HEAD  # Revert the domain config commit (Phase 2)
```

**4. Redeploy:**

```bash
pnpm prod:deploy
```

**Note:** Script changes from Phase 1 are still in place, so use `prod:deploy`. This removes the Route53 hosted zone and custom domain config. App will be accessible at the auto-generated CloudFront URL.

---

### Full Rollback: Previous Working State

**If you need to roll back to pre-TDD0000a state:**

**⚠️ WARNING:** This is a nuclear option. Only use if Quick Fix didn't work and you need to completely undo TDD0000a.

**1. Revert nameservers at Gandi FIRST** (same as Quick Fix step 1-2)

**2. Revert all TDD0000a commits:**

```bash
# Find the commits from TDD0000a
git log --oneline

# Revert them in reverse order (most recent first)
git revert <Phase-5-commit-hash>  # Domain config
git revert <Phase-1-commit-hash>  # Script changes

# This creates two new "undo" commits without destroying history
```

**3. Redeploy:**

```bash
# After reverting both commits, we're back to TDD0000 scripts
# where 'deploy' meant production
pnpm deploy
```

**Note:** Using `git revert` instead of `git reset --hard` preserves history and is safer for shared repositories. The `deploy` command goes to production here because we reverted Phase 1's script changes.

---

## Cost Impact

**New costs from this TDD:**

- **Route53 hosted zone:** ~$0.50/month
- **Route53 DNS queries:** ~$0.40/month for first million queries (negligible at MVP scale)
- **ACM certificate:** Free
- **CloudFront custom domain:** No additional cost beyond existing CloudFront usage

**Total new monthly cost: ~$0.90/month**

**Note:** Domain registration at Gandi (~$15-20/year) doesn't change. You're still renewing there.

---

## Open Questions

_None. Route53 approach is straightforward with SST automation._

---

## Related Context

- **PRD:** N/A (Infrastructure - extends TDD0000)
- **Previous TDD:** TDD0000 (Project Bootstrap)
- **Next TDD:** TDD0001 (Phone Identity System) - depends on production deployment being available
- **Roadmap Phase:** Pre-MVP (blocks public testing)

---

## Notes for Implementer

1. **Deployment scripts changed:** `pnpm deploy` now goes to personal stage. Use `pnpm prod:deploy` for production.
2. **Set production DatabaseUrl AND run migration FIRST:** Don't skip this prerequisite or app will crash
3. **DNSSEC already verified:** DNSSEC is Inactive at Gandi (verified 2026-02-17). Skip Prerequisite #5.
4. **Create Route53 zone manually first:** Phase 2 creates the zone in AWS Console. Get nameservers immediately, no deployment needed.
5. **Update nameservers BEFORE deploying:** Phase 3-4 update Gandi and wait for propagation. Deploy happens in Phase 6 after DNS is ready.
6. **Save Zone ID and nameservers:** From Phase 2, you'll need the Zone ID for SST config and the nameservers for Gandi.
7. **Save original Gandi nameservers:** Write them down in Phase 3 before changing. You'll need them for rollback.
8. **DNS propagation takes time:** Don't panic if domain doesn't work immediately - can take up to 48 hours
9. **Rollback requires nameserver revert FIRST:** Don't remove Route53 zone while nameservers point to it - causes DNS outage
10. **SST_STAGE env var bypasses safety:** Keep it unset. If set to "prod", `pnpm deploy` will deploy to production.
11. **Domain stays registered at Gandi:** We're only changing nameservers, not transferring registration
12. **Export existing DNS records:** Before changing nameservers (Phase 3), export any existing MX/TXT/etc records from Gandi

**This TDD does not change application code.** It's purely infrastructure configuration. Tests don't need updates because domain mapping is transparent to the app.

---

## Success Metrics

**How to know this is done:**

- [ ] Production DatabaseUrl secret is set AND migration run
- [x] Phase 2: Route53 hosted zone created manually in AWS Console ✅
- [x] Phase 2: Got Zone ID and 4 nameservers from Route53 ✅
- [x] Phase 3: Updated nameservers at Gandi ✅
- [x] Phase 4: DNS propagation confirmed (`dig NS turnout.network` shows AWS) ✅ **COMPLETE (2026-02-17)**
- [ ] Phase 5: SST config updated with domain and Zone ID
- [ ] Phase 6: Deployment succeeded with no errors (no cert validation failures)
- [ ] `https://turnout.network` loads in browser with valid SSL
- [ ] `https://www.turnout.network` redirects to apex (301/308)
- [x] `dig NS turnout.network` shows AWS Route53 nameservers ✅ **COMPLETE (2026-02-17)**
- [ ] SSL certificate covers both apex and www (check in browser)
- [ ] Dev stages still deploy to auto-generated URLs (not custom domain)
- [ ] Documentation updated with production deployment instructions
- [ ] Domain still registered at Gandi (whois check)

**When you can verify all checkboxes, this TDD is complete.**
