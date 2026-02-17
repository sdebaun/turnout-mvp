---
name: debug
description: Systematic debugging for "it worked, now it's broken" problems
version: 1.0.0
---

# Debug Skill

**Invoke with:** `/debug` or "use the debug skill"

**Use this when:** Something worked before but is now broken, and you need to systematically fix it.

---

## How This Skill Works

This skill creates a **multi-agent debugging team** that methodically identifies and fixes regressions.

**Before spawning agents, the skill:**
1. Reviews conversation history to understand the problem
2. Checks if `.debug-log.md` already exists (ongoing debug session?)
3. Asks you to confirm what we're debugging
4. Seeds the debug log with initial context
5. Asks what other context should be included

**Then spawns a team that:**
- **Checks CI failures first** (if this is a PR context) using GitHub MCP
- Investigates the current broken state
- Analyzes what changed between working and broken
- Forms ranked hypotheses based on evidence
- Tests fixes one at a time
- Maintains the debug log for continuity

**IMPORTANT:** This skill uses GitHub MCP server for CI failure detection. Tools will be loaded via ToolSearch as needed.

---

## Phase 0: Interactive Setup (YOU DO THIS)

**When the user invokes this skill, start here.**

### Step 1: Check for existing debug session

```bash
# Check if debug log exists
if [ -f .debug-log.md ]; then
  echo "Found existing .debug-log.md"
  # Read it and show summary to user
else
  echo "No existing debug log found"
fi
```

**If debug log exists:**
- Read it
- Summarize: What problem, what's been tried, current status
- Ask user: "Continue this debug session or start fresh?"
  - Continue → Skip to Step 4 (spawn team with context from log)
  - Start fresh → Proceed to Step 2

**If no debug log:**
- Proceed to Step 2

### Step 2: Review conversation history

**Search recent conversation for context:**
- Look for error messages
- Look for "worked before" / "now broken" statements
- Look for what changed (deployments, upgrades, config changes)
- Note: Conversation history before this skill invocation is available to you

**Extract:**
- What is broken (deployment, tests, build, runtime error?)
- What error messages or symptoms
- When it worked (timestamp, commit, version?)
- What might have changed

### Step 3: Confirm the problem with user

**Ask the user:**

```
I found this from conversation history:

PROBLEM: [what's broken]
ERROR: [error message if any]
LAST WORKED: [when/where it worked]
MIGHT HAVE CHANGED: [suspected changes]

Is this correct? What else should I know before starting the debug session?

[User can correct, add context, or confirm]
```

**Wait for user response.** Do not proceed until confirmed.

### Step 4: Seed the debug log

**Create `.debug-log.md` with initial context:**

```markdown
# Debug Session: [Problem Summary]

**Date Started:** [timestamp]
**Status:** Investigation starting

---

## Problem Statement

**What's broken:** [from user confirmation]

**Error message:**
```
[error if available]
```

**Last known working state:** [when it worked]

**Suspected changes:** [what might have changed]

**Additional context:** [anything user added]

---

## Session Log

### [timestamp] - Session Started
**Initiator:** User via /debug skill
**Next:** Spawn debugging team for Investigation phase

---
```

**Show this to user and ask:**
```
I've created the initial debug log above. Should I add anything else before
spawning the debugging team?

[User can add context or say proceed]
```

### Step 5: Spawn the debugging team

**Once user confirms, create the team:**

```
Creating debugging team:
- investigation-agent: Gather facts about current broken state
- timeline-agent: Identify what changed
- hypothesis-agent: Form ranked theories
- fix-agent: Test fixes methodically
- coordinator: Me (manage team, maintain log)

Starting Investigation phase...
```

**Then proceed to Phase 1 (Investigation) with the team.**

**CRITICAL: Spawn agents in parallel where possible**
- Investigation + Timeline agents can run simultaneously (spawn both in one message)
- Hypothesis agent must wait for Investigation + Timeline to complete
- Fix agent must wait for Hypothesis to complete

---

## Phase 1: Investigation

**Goal:** Document current broken state with concrete evidence.

**Investigation agent tasks:**
- **Check for CI failures first** (if this is a PR context)
- Run the failing operation, capture FULL output (stderr + stdout)
- Check versions of relevant tools/dependencies
- Check state of config files, lock files, cache
- Document findings in `.debug-log.md`

### CI Failure Detection (Do This First)

**Before investigating locally, check if this is a broken PR:**

First, load GitHub MCP tools:
```
Use ToolSearch: "select:mcp__github__pull_request_read"
```

Then check for PR and CI status:
```
# Get current branch name
git branch --show-current

# Search for PR with current branch as head
Tool: mcp__github__search_pull_requests
Parameters:
  query: "repo:[owner/repo] head:[branch-name] is:pr"

# If PR found, read full details including check status
Tool: mcp__github__pull_request_read
Parameters:
  owner: [owner]
  repo: [repo]
  pull_number: [number from search]
  minimal_output: false

# Check the statusCheckRollup or checks array in the response
# For failing checks, you may need to fetch run logs via GitHub API
# or fall back to local reproduction
```

**Parse CI logs for:**
- Build failures (TypeScript errors, import errors)
- Test failures (which tests failed, with full output)
- Lint/type-check failures
- Deployment failures (SST, Docker, etc.)

**Document in `.debug-log.md`:**
```markdown
### [timestamp] - CI Failure Analysis
**Agent:** investigation-agent
**PR:** #[number] - [title]
**Failed checks:** [list of check names]

**Failure #1: [check name]**
```
[relevant error output from logs]
```

**Failure #2: [check name]**
```
[relevant error output from logs]
```

**Local reproduction needed:** [yes/no]
**Next:** [Attempt local reproduction / Skip to Timeline if CI logs are sufficient]
---
```

**If CI logs give enough info:**
Skip local reproduction and proceed to Timeline phase with CI error as the "current broken state."

**If CI logs are unclear or insufficient:**
Continue with local investigation as normal.

**Anti-patterns:**
- ❌ Skipping CI failure checks (always check PR status first)
- ❌ Summarizing errors ("it says module not found")
- ❌ Skipping version checks
- ❌ Jumping to conclusions without evidence
- ❌ Reproducing locally when CI logs already show the root cause

**Coordinator checklist:**
- [ ] Full error output captured
- [ ] Relevant versions documented
- [ ] Current config state captured
- [ ] Findings written to debug log
- [ ] Team briefed before Timeline phase

**Common investigation commands:**
```bash
# Check for CI failures (do this first) - use GitHub MCP
# See CI Failure Detection section above for MCP tool usage

# Capture failing operation
[command] 2>&1 | tee error-output.txt

# Check versions
tool --version
pnpm list dependency --depth=3

# Find duplicate dependencies
find node_modules -name "package.json" -path "*/pkg/*" -exec grep version {} \;

# Check lock file for conflicts
grep "package-name" pnpm-lock.yaml
```

**Update `.debug-log.md`:**
```markdown
### [timestamp] - Investigation Complete
**Agent:** investigation-agent
**Error captured:** [yes/no]
**Versions checked:** [list]
**Key findings:** [bullet points]
**Next:** Timeline analysis
---
```

---

## Phase 2: Timeline Analysis

**Goal:** Identify what changed between working and broken state.

**Timeline agent tasks:**
- Review git history (commits, lock file changes, config changes)
- Ask user about environment changes (upgrades, reinstalls)
- Identify concrete differences
- Document in `.debug-log.md`

**If git history unhelpful:**
- Document the limitation
- Focus on "what could have changed in environment"
- Proceed with available information

**Common timeline commands:**
```bash
# Recent commits
git log --oneline --all -20

# Lock file changes
git diff HEAD~5 pnpm-lock.yaml

# Config changes
git diff HEAD~5 package.json sst.config.ts

# Check cache timestamps
stat node_modules/.cache
```

**Update `.debug-log.md`:**
```markdown
### [timestamp] - Timeline Analysis Complete
**Agent:** timeline-agent
**Git commits reviewed:** [count]
**Changes identified:** [list]
**Suspected trigger:** [what likely broke it]
**Next:** Hypothesis formation
---
```

---

## Phase 3: Hypothesis Formation

**Goal:** Generate ranked, testable theories about root cause.

**Hypothesis agent tasks:**
- Combine Investigation + Timeline findings
- Generate 3-5 concrete hypotheses
- Rank by likelihood (score 1-10)
- Specify testable fix for each
- Document in `.debug-log.md`

**Good hypothesis format:**
```
**Hypothesis #1 (Score: 8/10): Dependency X version mismatch**
- Evidence: Lock file shows X@2.0.0, was X@1.5.0 before
- Testable fix: Pin X to 1.5.0 in package.json, reinstall
- Reversible: Yes
- Risk: Low
```

**Bad hypothesis format:**
```
**Hypothesis #1: Something in dependencies**
- Fix: Reinstall everything
```

**Update `.debug-log.md`:**
```markdown
### [timestamp] - Hypotheses Ranked
**Agent:** hypothesis-agent

**Hypothesis #1 (Score: X/10):** [description]
- Evidence: [what supports this]
- Fix: [specific change to make]
- Risk: [Low/Medium/High]

**Hypothesis #2 (Score: X/10):** [description]
- Evidence: [what supports this]
- Fix: [specific change to make]
- Risk: [Low/Medium/High]

[... up to 5 hypotheses ...]

**Next:** Test hypothesis #1
---
```

---

## Phase 4: Fix Testing

**Goal:** Test hypotheses one at a time until fixed or top 3 exhausted.

**Fix agent workflow:**
```
1. Read top hypothesis from log
2. Make the ONE change specified
3. Document the change in log
4. Run failing operation
5. Capture FULL output
6. Evaluate:
   - ✅ Success? → Document fix, STOP
   - ❌ Failure? → Revert, document, move to hypothesis #2
7. Repeat for hypotheses #2, #3
8. If all fail: STOP, report findings
```

**Anti-patterns:**
- ❌ Testing multiple hypotheses at once
- ❌ Not reverting failed changes
- ❌ Repeating failed fixes
- ❌ Trying random things not in hypotheses

**Update `.debug-log.md` for each attempt:**
```markdown
### [timestamp] - Testing Hypothesis #X
**Agent:** fix-agent
**Hypothesis:** [which one]
**Change made:** [specific file/line changed]
**Command run:** [exact command]
**Result:** [✅ SUCCESS / ❌ FAILURE]
**Output:**
```
[full output or link to file]
```
**Action:** [STOPPED - fixed / REVERTED - trying #X next]
---
```

**When fixed:**
```markdown
### [timestamp] - 🎉 ISSUE RESOLVED
**Hypothesis that worked:** #X
**Fix applied:** [description]
**Verification:** [how we confirmed it works]
**Status:** COMPLETE
---
```

**When stuck after 3 attempts:**
```markdown
### [timestamp] - Debugging Stalled
**Hypotheses tested:** #1, #2, #3 (all failed)
**Findings:** [what we learned]
**Recommendation:** [escalate to human / try different approach / need more info]
**Status:** BLOCKED - awaiting guidance
---
```

---

## Rules for All Agents

1. **Update `.debug-log.md` after every significant action**
2. **Read the log before doing anything** (don't repeat failed attempts)
3. **One change at a time** in Fix phase
4. **Full output always** (no summaries)
5. **Revert failed changes** before trying next hypothesis
6. **Stop when fixed OR after testing top 3 hypotheses**
7. **Evidence over intuition** (document facts, not guesses)

---

## Team Structure

**Coordinator (You):**
- Run Phase 0 (interactive setup)
- Spawn the 4-agent team **in parallel where possible**
- Phase 1: Spawn investigation + timeline agents together (parallel)
- Phase 2: Wait for Phase 1, then spawn hypothesis agent
- Phase 3: Wait for Phase 2, then spawn fix agent
- Maintain `.debug-log.md`
- Decide when to stop

**Investigation Agent:**
- Capture current broken state
- Document errors, versions, config

**Timeline Agent:**
- Identify what changed
- Review git history and environment

**Hypothesis Agent:**
- Form ranked theories
- Specify testable fixes

**Fix Agent:**
- Test one hypothesis at a time
- Revert failures, document results

---

## Example Session Flow

**User invokes:**
```
/debug
```

**Skill (Phase 0):**
```
Checking for existing debug session...
No .debug-log.md found.

Reviewing conversation history...

I found this problem:
- PROBLEM: SST deployment fails with "module_1.register is not a function"
- ERROR: TypeError in Pulumi module
- LAST WORKED: 30 minutes ago (first deploy succeeded)
- MIGHT HAVE CHANGED: Dependencies, SST state, or config

Is this correct? What else should I know?
```

**User confirms or adds context.**

**Skill creates `.debug-log.md`, asks for additional context, then:**
```
Creating debugging team...
Starting Investigation phase...
```

**Investigation agent:**
- Runs `sst deploy`, captures full error
- Checks SST version, Pulumi versions
- Documents findings in log

**Timeline agent:**
- Reviews git history
- Identifies that `sst remove` was run between working and broken
- Documents suspected trigger

**Hypothesis agent:**
- Forms 3 hypotheses ranked by likelihood
- Documents in log

**Fix agent:**
- Tests hypothesis #1 (deletes `.sst/platform`, redeploys)
- ✅ It works!
- Documents success in log

**Skill reports to user:**
```
🎉 Issue resolved!

Hypothesis that worked: Delete .sst/platform and rebuild
Root cause: Corrupted platform state from failed redeploy
Fix verified: Deployment succeeded

Full details in .debug-log.md
```

---

## When to Use This Skill

**DO use when:**
- ✅ Something worked, now broken (regression)
- ✅ PR has failing CI checks (tests, build, deploy)
- ✅ Need systematic approach (random fixes aren't working)
- ✅ Multiple agents would speed things up
- ✅ Might need to hand off to another team

**DON'T use when:**
- ❌ Feature never worked (not a regression)
- ❌ Error is obvious with clear fix (just fix it)
- ❌ Simple one-line issue (overhead not worth it)

---

## Success Criteria

**This skill succeeds when:**
- ✅ Regression is fixed and verified
- ✅ Root cause documented
- ✅ `.debug-log.md` has complete record

**Provides value even if stuck when:**
- ✅ Top hypotheses tested and documented
- ✅ Evidence gathered for user decision
- ✅ Failed attempts logged (next team won't repeat)

---

**Built for:** Systematic debugging with multi-agent coordination and interactive setup.
