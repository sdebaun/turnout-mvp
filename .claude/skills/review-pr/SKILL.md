---
name: review-pr
description: Multi-agent PR review with specialized reviewers
version: 1.0.0
---

# PR Review Skill

**Invoke with:** `/review-pr [number]` or `/review-pr [url]`

**Use this when:** You want a systematic, multi-perspective code review before merging.

---

## How This Skill Works

This skill creates a **multi-agent review team** where each agent specializes in a different aspect of code quality.

**Uses GitHub MCP for review workflow:**
- `create_pull_request_review` - creates a pending review
- `add_review_comment` - adds inline comments on specific lines (each reviewer uses this)
- `submit_pending_pull_request_review` - submits with APPROVE/REQUEST_CHANGES/COMMENT

**Before spawning agents, the skill:**
1. Fetches PR details using `gh pr view` (for simplicity)
2. Shows you a summary and asks for confirmation
3. Lets you choose full review or focus areas
4. Seeds the review log with PR context
5. Creates a pending review on GitHub

**Then spawns a team that:**
- Reviews architecture alignment
- Checks test coverage and quality
- Hunts for security vulnerabilities
- Verifies code style and documentation
- Each adds inline comments to the pending review
- Coordinator submits the final review with overall verdict

---

## Phase 0: Interactive Setup (YOU DO THIS)

**When the user invokes this skill, start here.**

### Step 1: Get the PR number

**If user provided a number/URL:**
- Extract PR number from input
- Proceed to Step 2

**If no number provided:**
```
Which PR should I review?

Provide:
- PR number (e.g., "42")
- PR URL (e.g., "https://github.com/user/repo/pull/42")
- Or "latest" for the most recent PR
```

**Wait for user response.**

### Step 2: Fetch PR details

**Use gh CLI to get PR information:**
```bash
# Get PR details
gh pr view [number] --json number,title,author,body,state,files,commits,additions,deletions

# Get the diff
gh pr diff [number]
```

**Extract:**
- PR number, title, author
- Description/body
- Files changed (count and paths)
- Additions/deletions
- Current state (open, closed, merged)

### Step 3: Show summary and confirm scope

**Show the user:**
```
PR #[number]: [title]
Author: [author]
Status: [state]

Files changed: [count]
+[additions] -[deletions]

Description:
[first 5 lines of body]

What should I review?

1. Full review (all aspects) - Recommended
2. Architecture only
3. Security only
4. Tests only
5. Style & documentation only
6. Custom (you pick)
```

**Wait for user response.**

### Step 4: Seed the review log

**Create `pr-review-[number].md` with initial context:**

```markdown
# PR Review: #[number] - [title]

**Date Started:** [timestamp]
**Author:** [author]
**Status:** [state]

---

## PR Summary

**Files changed:** [count]
**Lines changed:** +[additions] -[deletions]

**Description:**
[body]

**Files:**
[list of changed files]

---

## Review Scope

**Reviewing:** [Full / Architecture / Security / Tests / Style / Custom]

---

## Session Log

### [timestamp] - Review Started
**Initiator:** User via /review-pr skill
**Next:** Spawn review team

---
```

**Show this to user and confirm:**
```
Review log created. Spawning review team for [scope] review...

Ready to proceed?
```

**Wait for confirmation.**

### Step 5: Spawn the review team

**Based on scope, spawn appropriate agents:**

**Full review:**
```
Creating review team:
- architecture-reviewer: Check alignment with ARCHITECTURE.md, ROADMAP.md
- test-reviewer: Verify test coverage and quality
- security-reviewer: Hunt for vulnerabilities and secrets
- style-reviewer: Check conventions and documentation
- coordinator: Me (synthesize findings, manage team)

Starting parallel review...
```

**Focused review:**
Only spawn the relevant reviewer(s).

**Then proceed to Phase 1 (Parallel Review) with the team.**

---

## Phase 1: Parallel Review

**Goal:** Each specialized reviewer examines the PR from their perspective.

**All reviewers have access to:**
- PR diff: `gh pr diff [number]`
- Changed files: Can read full files with Read tool
- Project docs: ARCHITECTURE.md, ROADMAP.md, CLAUDE.md, etc.
- Git history: `git log`, `git show`

### Architecture Reviewer Tasks

**Focus:** Does this PR align with our technical decisions and roadmap?

**Check:**
- [ ] Does it use the approved stack (Next.js 14 App Router, Prisma, SST)?
- [ ] Does it follow server-first pattern (Server Components/Actions)?
- [ ] Does it align with ROADMAP.md priorities?
- [ ] Does it introduce new dependencies unnecessarily?
- [ ] Does it violate ARCHITECTURE.md principles?
- [ ] Does it add infrastructure as code (or use UI clicks)?

**Read these docs:**
- context/ARCHITECTURE.md
- context/ROADMAP.md
- sst.config.ts (if infrastructure changed)
- package.json (if dependencies changed)

**Post findings:**

For each issue found, add an inline review comment using GitHub MCP:
```
# Use the GitHub MCP tool to add review comments
Tool: add_review_comment
Parameters:
  owner: [repo owner from PR]
  repo: [repo name from PR]
  pull_number: [PR number]
  body: "❌ BLOCKER: This introduces a new state management library, but ARCHITECTURE.md specifies Server Components as the state pattern."
  path: "package.json"
  line: 23
```

**Update review log:**
```markdown
### [timestamp] - Architecture Review Complete
**Reviewer:** architecture-reviewer

**Alignment:** [✅ Good / ⚠️ Concerns / ❌ Violations]

**Findings:**
- [bullet points of issues or approval]
- [include file:line references for each inline comment posted]

**Recommendation:** [Approve / Request changes / Block]
---
```

### Test Reviewer Tasks

**Focus:** Are there tests, and are they meaningful?

**Check:**
- [ ] Are there test files for new features?
- [ ] Do tests actually test behavior (not just existence)?
- [ ] Are edge cases covered?
- [ ] Do tests follow naming conventions?
- [ ] Are there E2E tests for user-facing changes?
- [ ] Can the tests be run successfully?

**Commands to run:**
```bash
# Find test files in the diff
gh pr diff [number] | grep -E '\.(test|spec)\.(ts|tsx|js|jsx)'

# If tests exist, try to run them
pnpm test

# Check test coverage if available
pnpm test:coverage
```

**Post findings:**

For each issue found, add an inline review comment using GitHub MCP:
```
Tool: add_review_comment
Parameters:
  owner: [repo owner]
  repo: [repo name]
  pull_number: [PR number]
  body: "⚠️ CONCERN: No test file found for this new Server Action. Consider adding apps/web/app/actions.test.ts"
  path: "apps/web/app/actions.ts"
  line: 1
```

**Update review log:**
```markdown
### [timestamp] - Test Review Complete
**Reviewer:** test-reviewer

**Test coverage:** [✅ Good / ⚠️ Partial / ❌ Missing]

**Findings:**
- [test files found or missing]
- [test quality assessment]
- [coverage gaps]
- [include file:line references for each inline comment posted]

**Recommendation:** [Approve / Request changes / Block]
---
```

### Security Reviewer Tasks

**Focus:** Does this PR introduce security vulnerabilities?

**Check:**
- [ ] Are there hardcoded secrets, API keys, passwords?
- [ ] Does it handle user input safely (SQL injection, XSS)?
- [ ] Does it expose sensitive data in logs or errors?
- [ ] Are authentication/authorization checks present?
- [ ] Does it use dangerous functions (eval, exec, innerHTML)?
- [ ] Are dependencies from trusted sources?
- [ ] Does it follow principle of least privilege?

**Search patterns:**
```bash
# Look for potential secrets
gh pr diff [number] | grep -iE '(password|secret|api_key|token|auth)'

# Look for SQL injection risks
gh pr diff [number] | grep -iE '(query|execute|sql)'

# Look for XSS risks
gh pr diff [number] | grep -iE '(innerHTML|dangerouslySetInnerHTML)'

# Check new dependencies
git diff main -- package.json | grep '^\+.*"'
```

**Post findings:**

For each issue found, add an inline review comment using GitHub MCP:
```
Tool: add_review_comment
Parameters:
  owner: [repo owner]
  repo: [repo name]
  pull_number: [PR number]
  body: "🚫 BLOCKER: Hardcoded Twilio API key. Move to SST secrets or environment variables."
  path: "apps/web/app/actions.ts"
  line: 42
```

**Update review log:**
```markdown
### [timestamp] - Security Review Complete
**Reviewer:** security-reviewer

**Security posture:** [✅ Safe / ⚠️ Concerns / ❌ Vulnerabilities]

**Findings:**
- [security issues or clearance]
- [include file:line references for each inline comment posted]

**Recommendation:** [Approve / Request changes / Block]
---
```

### Style Reviewer Tasks

**Focus:** Does this follow our conventions and is it well-documented?

**Check:**
- [ ] Do files follow naming conventions?
- [ ] Are functions/components reasonably sized?
- [ ] Is code self-documenting or commented where needed?
- [ ] Are commit messages clear and follow conventions?
- [ ] Is there unnecessary complexity?
- [ ] Are TODOs or FIXMEs left behind?
- [ ] Does it follow TypeScript best practices?

**Review:**
- File and function naming
- Code organization
- Comments (are they explaining "why" not "what"?)
- Commit messages: `git log origin/main..HEAD`
- TypeScript usage (any `any` types?)

**Post findings:**

For each issue found, add an inline review comment using GitHub MCP:
```
Tool: add_review_comment
Parameters:
  owner: [repo owner]
  repo: [repo name]
  pull_number: [PR number]
  body: "⚠️ CONCERN: This function is 150 lines. Consider extracting helpers for readability."
  path: "apps/web/app/actions.ts"
  line: 45
```

**Update review log:**
```markdown
### [timestamp] - Style Review Complete
**Reviewer:** style-reviewer

**Code quality:** [✅ Clean / ⚠️ Needs polish / ❌ Messy]

**Findings:**
- [style issues or praise]
- [include file:line references for each inline comment posted]

**Recommendation:** [Approve / Request changes / Minor nitpicks]
---
```

---

## Phase 2: Synthesis & Reporting

**Goal:** Coordinator compiles all findings into a coherent review.

**Coordinator workflow:**
```
1. Read all reviewer updates from pr-review-[number].md
2. Identify blocking issues vs. suggestions
3. Group findings by severity:
   - 🚫 Blockers (must fix before merge)
   - ⚠️ Concerns (should fix, or justify why not)
   - 💡 Suggestions (nice to have)
4. Write synthesis to review log
5. Ask user: Post to GitHub or just show me?
```

**Synthesis format in review log:**
```markdown
### [timestamp] - 📋 Review Synthesis

**Overall recommendation:** [APPROVE / REQUEST CHANGES / BLOCK]

---

#### 🚫 Blockers (must fix)

[List of blocking issues from all reviewers]

---

#### ⚠️ Concerns (should address)

[List of non-blocking concerns]

---

#### 💡 Suggestions (optional improvements)

[List of suggestions]

---

#### ✅ Strengths

[What the PR does well]

---

**Next steps:**
[What the author should do]

---
```

**Ask user:**
```
Review complete! Findings saved to pr-review-[number].md

Would you like me to:
1. Post inline comments + review to GitHub
2. Just show me the summary (don't post)
3. Let me edit before posting
```

**If user chooses to post:**

**Step 1: Create pending review (coordinator does this first):**
```
Tool: create_pull_request_review
Parameters:
  owner: [repo owner]
  repo: [repo name]
  pull_number: [PR number]
  # No event parameter = creates pending review
```

**Step 2: Each reviewer adds their inline comments:**

All reviewers use `add_review_comment` to add their findings to the pending review (see reviewer sections above for examples).

**Step 3: Coordinator submits the final review:**

```
Tool: submit_pending_pull_request_review
Parameters:
  owner: [repo owner]
  repo: [repo name]
  pull_number: [PR number]
  body: [synthesis from pr-review-[number]-synthesis.md]
  event: [APPROVE / REQUEST_CHANGES / COMMENT]

# Use REQUEST_CHANGES if blockers exist
# Use APPROVE if only suggestions
# Use COMMENT if just concerns
```

---

## Rules for All Reviewers

1. **Be specific:** Reference file names, line numbers, function names
2. **Be constructive:** Suggest fixes, not just complaints
3. **Prioritize correctly:** Distinguish blockers from nitpicks
4. **Check against docs:** ARCHITECTURE.md, ROADMAP.md, CLAUDE.md are source of truth
5. **Update review log:** Document findings after each review
6. **No gatekeeping:** If something works and isn't a security risk, don't block on style preferences
7. **Praise good work:** Call out well-written code, good tests, clear commits

---

## Team Structure

**Coordinator (You):**
- Run Phase 0 (interactive setup)
- Spawn the review team (4 agents for full review)
- Ensure reviewers work in parallel
- Synthesize findings
- Post to GitHub if requested

**Architecture Reviewer:**
- Check alignment with ARCHITECTURE.md, ROADMAP.md
- Verify stack decisions
- Flag unnecessary complexity or dependencies

**Test Reviewer:**
- Verify test coverage
- Assess test quality
- Run tests if possible

**Security Reviewer:**
- Hunt for vulnerabilities
- Check for secrets
- Verify input validation

**Style Reviewer:**
- Check code conventions
- Review commit quality
- Flag unnecessary complexity

---

## Example Session Flow

**User invokes:**
```
/review-pr 123
```

**Skill (Phase 0):**
```
Fetching PR #123...

PR #123: Add user authentication
Author: alice
Status: open

Files changed: 12
+847 -23

Description:
Implements phone-based OTP authentication per PRD0001...

What should I review?
1. Full review (all aspects) - Recommended
2. Architecture only
[etc.]
```

**User selects "1. Full review"**

**Skill creates review log, then:**
```
Review log created at pr-review-123.md

Creating review team:
- architecture-reviewer
- test-reviewer
- security-reviewer
- style-reviewer
- coordinator (me)

Starting parallel review...
```

**Reviewers work in parallel:**
- Architecture reviewer reads ARCHITECTURE.md, checks if auth approach matches
- Test reviewer looks for test files, runs them
- Security reviewer scans for hardcoded secrets, checks OTP implementation
- Style reviewer checks commit messages, code organization

**After all reviewers finish, coordinator synthesizes:**
```
Review complete!

📋 Findings:
- 1 blocker: Hardcoded Twilio API key in actions.ts:42
- 2 concerns: Missing E2E tests for OTP flow, no rate limiting
- 3 suggestions: Extract OTP logic to lib/, add JSDoc for public functions

Full review saved to pr-review-123.md

Would you like me to post this to GitHub?
```

**User says yes, skill posts comment to PR #123**

---

## When to Use This Skill

**DO use when:**
- ✅ PR is ready for review (not draft)
- ✅ You want systematic, multi-perspective feedback
- ✅ PR is non-trivial (>50 lines changed)
- ✅ You have time for a thorough review

**DON'T use when:**
- ❌ Trivial changes (typo fixes, README updates)
- ❌ Draft PRs (not ready for review)
- ❌ You just want to check one specific thing (do it manually)

---

## Success Criteria

**This skill succeeds when:**
- ✅ All reviewers complete their assigned checks
- ✅ Findings are specific and actionable
- ✅ Synthesis clearly categorizes blockers vs. suggestions
- ✅ Review is documented in pr-review-[number].md

**Provides value even if it finds nothing:**
- ✅ Confirmation that PR aligns with architecture
- ✅ Verification that tests exist and pass
- ✅ Security clearance documented

---

**Built for:** Systematic multi-agent PR review with specialized perspectives.
