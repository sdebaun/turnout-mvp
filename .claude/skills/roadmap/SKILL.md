---
name: roadmap
description: "Generate a structured roadmap in 15 minutes that links every initiative to business objectives and measurable outcomes. Use when: build roadmap, roadmap, create roadmap, quarterly roadmap, product roadmap."
---

# Roadmap Builder

Generate a structured roadmap in 15 minutes that links every initiative to business objectives and measurable outcomes.

## When to Use This Skill

- Quarterly or annual planning cycles
- Executive or board alignment meetings
- New PM onboarding to existing roadmap
- Strategic reprioritization after major changes

## The Problem

Building roadmaps from scratch takes days of spreadsheet wrangling, stakeholder alignment, and trying to connect random feature requests to business goals. Most PMs end up with feature lists that executives question: "Why are we building this again?"

This skill generates a structured roadmap in 15 minutes that explicitly links every initiative to business objectives and measurable product outcomes — giving you the "why" built in.

## What You'll Get

A complete roadmap with:

- Business goals linked to every initiative (so executives see the "why")
- Now/Next/Later buckets showing what's happening when
- Product outcomes you'll measure (not just features you'll ship)
- Dependencies and risks flagged upfront
- Parking lot for ideas you're explicitly deferring

## What You'll Need

**Required:**

- Planning horizon (quarter, half, year)
- Key initiatives to consider

**Helpful (from context files or provided):**

- Strategic priorities and goals
- Team capacity and constraints
- Known dependencies or blockers
- Business drivers (revenue, deals, competitive pressure)

## Process

### Step 1: I'll Read Your Context First

I'll start by checking your context files for:

- `context/VISION.md` - the product vision
- `context/UL.md` - the ubiquitous language definitions
- `context/user-stories.md` - early drafts of user experiences we want to create
- `context/product.md` — Is this feature already on the roadmap? What's the current state?
- `context/personas.md` — Who experiences this problem? What do we know about their pain?
- `context/company.md` — Does this align with strategic priorities?
- `context/competitors.md` — Do competitors have this? Is it table stakes?

I'll tell you what I found so you know what I'm working with. For example:

> "I pulled your strategic priorities from company.md: 'Win the Agency Vertical' and 'Expand AI Capabilities.' Your Q2 roadmap includes Resource Planning v2, Adobe integration, and SSO. I'll map these to business objectives and product outcomes."

_You don't need to do anything here — I'll read the files automatically._

### Step 2: I'll Ask Only What's Missing

Based on what I find in your context files, I'll ask for:

- **Planning horizon** — Q2, H1, full year?
- **New initiatives** — Anything to add beyond what's in product.md?
- **Strategic context** — If I don't have enough to prioritize, I'll ask you to share OKRs, exec priorities, or team capacity info

If I have enough from your files, I'll say:

> "Based on your product and company docs, I have what I need to draft a Q2 roadmap. I'll flag any assumptions about capacity or timing."

_Tip: The more context you keep in your files, the less I'll need to ask._

### Step 3: Map Business Objectives → Product Outcomes

Before organizing initiatives, I'll establish the chain that connects business goals to product work:

1. **Business Objectives:** What the company needs to achieve (from company.md priorities)
2. **Product Outcomes:** The measurable product changes that will drive those objectives

Product outcomes are "leading" because they happen BEFORE the business outcome — they're the product lever you pull to move the business metric.

For example:

> Business Objective: "Increase NRR to 120%"
> → Product Outcome: "Reduce time-to-value for new agencies from 14 days to 3 days"
> → Product Outcome: "Increase feature adoption in first 30 days from 40% to 70%"

Improving these product metrics (time-to-value, adoption) _leads_ to the business outcome (NRR).

### Step 4: Organize Initiatives into Now/Next/Later

Map each initiative to its product outcome:

- **Now:** Highest priority, starting immediately, clear ownership
- **Next:** Starts after Now completes, dependencies identified
- **Later:** Important but deferred, with clear rationale

Use what you know from context files to justify placement. For example:

> "Resource Planning v2 is 'Now' because it directly supports the outcome 'Reduce PM admin time by 50%' which drives NRR. Jordan (PM persona) cited resource conflicts as a top pain point."

### Step 5: Identify Constraints and Drivers

Look for or ask about:

- Team capacity (engineering, product, design)
- Hard deadlines (deals blocked, regulatory, events)
- CEO/exec priorities
- Competitive pressure

**Don't invent constraints.** If capacity isn't in your files, ask:

> "What's your team capacity for Q2? Or should I flag this as TBD?"

### Step 6: Add Dependencies and Risks

For each major initiative, identify:

- What must happen first
- What could go wrong
- Who owns mitigation

### Step 7: Define Success Metrics

For the planning period, specify:

- What metric will move
- From what baseline to what target
- How you'll measure it

**Important:** Pull actual metrics from `product.md` when available. If you don't have baselines, mark as `[PLACEHOLDER — need baseline]` rather than making up numbers.

## Output Template

**I'll generate all of this for you.** You just provide the inputs — I'll fill in the structure, map initiatives to outcomes, and flag assumptions.

Here's what you'll get:

```markdown
# [Company] [Period] Product Roadmap

## Context

_What I pulled from your files:_

- **Strategic priorities:** [From company.md]
- **Current roadmap:** [What's already planned from product.md]
- **Key user pain points:** [From personas.md]
- **Competitive factors:** [From competitors.md]

## Planning Context

**Planning Period:** [Quarter/Half/Year]
**Team Capacity:** [From company.md or ask — mark TBD if unknown]

---

## Business Objectives

_What the company needs to achieve this period_

| Objective                           | Source                                                              | Key Metric                  |
| ----------------------------------- | ------------------------------------------------------------------- | --------------------------- |
| [What the company needs to achieve] | [Where this came from — e.g., company.md, CEO priority, board deck] | [How we'll measure success] |

_The "Source" column shows where each objective came from so stakeholders can trace priorities back to strategic docs._

---

## Leading Product Outcomes

_The product changes that will drive business objectives_

| Outcome     | Drives Objective        | Current                   | Target   |
| ----------- | ----------------------- | ------------------------- | -------- |
| [Outcome 1] | [Objective it supports] | [Baseline or PLACEHOLDER] | [Target] |
| [Outcome 2] | [Objective]             | [Baseline]                | [Target] |

---

## Now

_Starting immediately — highest priority_

| Initiative   | Drives Outcome  | Owner         | Dependencies |
| ------------ | --------------- | ------------- | ------------ |
| [Initiative] | [Which outcome] | [Team/Person] | [Deps]       |

**Why Now:** [Rationale — reference context if applicable]

## Next

_Starts after Now completes_

| Initiative   | Drives Outcome  | Owner         | Dependencies |
| ------------ | --------------- | ------------- | ------------ |
| [Initiative] | [Which outcome] | [Team/Person] | [Deps]       |

**Why Next:** [Rationale — what needs to happen first]

## Later

_Important but deferred_

| Initiative   | Drives Outcome  | Reason for Deferral |
| ------------ | --------------- | ------------------- |
| [Initiative] | [Which outcome] | [Why it can wait]   |

---

## Dependencies & Risks

| Risk   | Impact | Mitigation       | Owner |
| ------ | ------ | ---------------- | ----- |
| [Risk] | H/M/L  | [How to address] | [Who] |

## Parking Lot

_Items considered but not prioritized this period:_

- [Item] — [Why deferred]

## Assumptions to Validate

_Things I inferred that you should confirm:_

- ⚠️ [Assumption 1]
- ⚠️ [Assumption 2]
```

## How This Works

This skill uses two proven roadmapping approaches:

**1. Objective → Outcome → Initiative Chain**
Every initiative on your roadmap connects to a measurable product outcome (like "reduce churn by 10%"), which connects to a business goal (like "increase revenue"). This gives you the "why" behind every feature.

**2. Now/Next/Later (Janna Bastow, ProdPad)**
Instead of fixed dates, you organize work by priority and time horizons. This makes roadmaps easier to maintain when plans change.

## Tips for Best Results

1. **Add strategic context to your files** — If you have OKRs, exec priorities, or quarterly goals, put them in `company.md`. The more I know, the better I can prioritize.
2. **Share your current roadmap** — If you have an existing roadmap (even a messy one), I can refine it instead of starting from scratch.
3. **Review the assumptions section** — I'll flag anything I'm guessing about so you can confirm or correct.
4. **Iterate on outcomes** — If the product outcomes I suggest don't feel right, tweak them. The initiatives flow from the outcomes.
