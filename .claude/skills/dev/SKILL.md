---
name: dev
description: Multi-agent development team for implementing features from TDDs
version: 2.0.0
---

# Dev Team Skill

**Invoke:** `/dev`

**Use when:** You have a complete TDD and are ready to implement.

---

## How This Works

**Lightweight orchestration, not micromanagement.**

1. **Setup:** Find TDD/PRD, evaluate readiness, confirm
2. **Build:** Spawn team, hand them context docs, let them work
3. **Validate:** Check criteria, run tests
4. **Commit:** Review, message, done

The team reads context docs and coordinates. You just orchestrate.

---

## Phase 0: Setup

### Step 0.1: Get your shit together

**Figure out what we're working on:**

- Check `.dev-session.md` (resume existing?)
- Check conversation (TDD mentions, recent `/tdd` usage)
- Guess TDD, ask user to confirm
- All tdd's should live in `context/tdd`

**Find the PRD:**

- Check TDD for PRD reference
- If not found: glob `prd/*.md`, show list, ask which one
- If user says "no PRD": warn twice, then proceed

**Evaluate TDD readiness:**

- Has acceptance criteria? Technical approach? Schema/infra (if needed)?
- If incomplete: offer to update TDD, proceed anyway, or cancel

**Confirm:**

```
📋 TDD: [number and title]
PRD: [file or None]
🎯 Criteria: [list]

Are you ready to release the kraken???
```

**Create `.dev-session.md`.**. This will be a running log you will monitor. your agents will report to that when they hit blockers or checkpoints.

```markdown
# Dev Session: [Feature]

TDD: [file] | PRD: [file or None]
Criteria: [list]
Context: Read all docs in context/
Log: [timestamp] - Spawning team...
```

### Step 0.2 Fire up the crew

Use your own judgement to decide what agents you should spawn and how you want to break up the work. Choose the best set of agents that will get you to a complete PR, deployed in the user's personal stage, with passing tests, that fulfills the TDD & PRD requirements.
You monitor, you coordinate, you don't micromanage.

Make sure each agent you spin up knows:

- the same context docs that you do (TDD, PRD, ARCHITECTURE, VISION, ROADMAP, INSPIRATION, UL)
- the specific criteria they are responsible for implementing
- that they should report their progress and blockers in `.dev-session.md` as well as directly to you

## Phase 1: Build

**Team works. You monitor `.dev-session.md`.**

If stuck (no updates), check in. Otherwise, let them work.

When team reports "done" → Validate.

---

## Phase 2: Validate

### Run tests

```bash
pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build
```

All must pass.

### Check criteria

For each:

```
✅ [Criterion] - Implementation: [where], Tests: [which], Verified: [yes/no]
```

**If fails:** Send team back.

**If passes:**

```
✅ All criteria met
✅ All tests passing
Ready to commit!
```

---

## Phase 3: Commit

### Draft message

**Format:** `TDD[number]: [Title]` (becomes PR title)

```
TDD0001: Phone-based authentication with OTP codes

Implements tdd0001-phone-auth.md:
- [1 line per criterion]

Tests: [X] integration, [X] E2E, all passing

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Confirm and commit

```
Files: [list]
Message: [show]
Approve? (yes/no/edit)
```

```bash
git add [specific files]
git commit -m "$(cat <<'EOF'
[message]
EOF
)"
```

### Update log

```markdown
### [timestamp] - ✅ COMPLETE

Commit: [hash]
All tests: ✅ Passing
All criteria: ✅ Met
```

---

## Rules for Team

1. Read ALL context docs (ARCHITECTURE, VISION, ROADMAP, INSPIRATION, UL)
2. Read TDD + PRD
3. Update `.dev-session.md`
4. Write tests (not optional)
5. All tests must pass
6. Coordinate yourselves

---

## When to Use

**DO:**

- ✅ Complete TDD with criteria
- ✅ Ready to build now

**DON'T:**

- ❌ Incomplete TDD
- ❌ Bug fixes (/debug)
- ❌ Trivial changes
- ❌ Experiments

---

**Built for:** Lightweight orchestration.
