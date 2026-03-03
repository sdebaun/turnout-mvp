# Design Feedback: Full Flow Review (Round 3)

_Four-agent review of the full organizer flow: Discovery → Step 0 (fork) → Step 1 (when/where) → Step 2 (name it) → Step 3 (auth) → Step 3.5 (OTP) → Turnout Detail. Perspectives: UX flow & usability, visual design & aesthetics, copy & brand voice, maintainability & engineering handoff._

---

## What Round 2 Fixed — Confirmed

Significant progress. Every agent confirmed these were resolved:

- ✅ Discovery CTA headline → Zilla Slab Bold
- ✅ Step 1 subtitle → "Pick something — you can always adjust it later."
- ✅ Step 3 subtitle → "One last step and it's yours."
- ✅ Inter font in Step 3 trust block → Plus Jakarta Sans
- ✅ Trust block copy → positive framing ("Your number is only used for updates about your turnouts…")
- ✅ SMS confirmation line on Step 3.5 → "We just texted you a 6-digit code."
- ✅ Organizer status → "You're organizing this."
- ✅ Discovery page background → `#FAFAF7`

---

## Where All Four Converge

### Step 0 is still dead weight

UX: breaks momentum — Bob clicked "Start a Turnout" and gets a categorization question. One of two options is locked. The disabled tile signals an incomplete product at exactly the moment he's deciding whether to trust it. Copy: "Which of these is you?" is survey language that breaks the action-framing of every other headline in the flow. Visual: selected-state differentiation too thin, no opacity on disabled tile despite docs saying 35%. Handoff: tile selection behavior has no annotation.

**All four say: cut this screen for MVP.** Route "Start a Turnout" directly to Step 1. If you must keep it for future infrastructure reasons, hide the disabled tile entirely. Re-introduce the fork when Cathy's story is written and both paths are real choices.

### Date/Time placeholders are still "Choose a date" / "Choose a time"

Every reviewer flagged this. Outstanding since Round 1. "Choose a date" describes the widget affordance — the icons already do that. The product's best micro-decision is human-relative time ("This Friday · 7 PM"). The placeholders should demonstrate that warmth. Fix: **"This Friday"** and **"7:00 PM"**.

### "Add a description" still competes with Share

UX and visual both flag: the description card sits above the Share button with a coral-tinted border (`#D95F3B50`). Four wizard steps trained Bob to follow coral as "the thing to do next." The description prompt hijacks that trained signal at the moment Bob's only goal is sharing. Fix: **move below Share AND change border accent from coral to sage/neutral**.

### Documentation contradicts design: "My Turnout" color

Handoff caught a critical contradiction. DESIGN-DECISIONS.md said `#B5ADA8`; the actual design file has `#DDD8D0` on all four nodes (wAY23, 15c3Z, Y7CSk, rE1X7). An engineer reading docs got one color; reading the file got another. **Fixed: DESIGN-DECISIONS.md updated to `#DDD8D0` — the intent is that "My Turnout" reads as a text-shaped skeleton bar, not as readable placeholder text.**

---

## Critical: Engineering Blockers

These gaps make implementation ambiguous. An engineer cannot ship without resolving them.

### No error states for any form input

Zero variants showing validation failure across InputDate, InputTime, InputLocation, InputPhone, InputText, or OTP digits. Engineers need: error border color, message position, message font/size/color, and clear behavior (on focus? on valid input?). This is the single biggest gap before handoff.

### No loading or disabled button states

ContinueButton has no disabled variant (form incomplete). "Send code" and "Create Turnout" have no loading variant (waiting for API). These are async operations — users will see these states.

### No "Resend code" affordance on OTP screen

"We just texted you a 6-digit code" with no recovery path if it doesn't arrive. SMS delivery failures happen. A "Didn't get it? Resend." link is a real user need, not polish.

---

## High Priority: Visual

### Nav bar uses three different greens

The nav bar is the most prominent brand signal. It's inconsistent:

| Context | Color | Value |
|---------|-------|-------|
| Discovery, Turnout Detail nav | `#2F5441` | darker sage |
| Wizard focused nav | `#243D30` | near-black green |
| Wizard header zones | `#3D6B52` | Direction C primary |

None use the Direction C primary. Two different undocumented darks. **Pick ONE nav dark. `#2F5441` is the better choice (used on 2 of 3 contexts, sage-family). Document as `--nav-bg`. Fix wizard nav from `#243D30`.**

### Two competing ambers from two rejected palettes

Direction C has no amber. Both ambers in use were borrowed:

- `#C8831A` — from Direction A (Ochre). Used on: pip fills, Step 0 accent bar, Step 0 selected title.
- `#E8A020` — from Direction B (Warm Amber). Used on: CTA cycling word "people."

They serve the same role (warm accent) and are close enough to look like a mistake. **Pick ONE. Add it to Direction C as a formal amber slot.** `#E8A020` is brighter, better at small sizes; `#C8831A` has more gravity for display text. Either works. Decide and use it everywhere.

### Type scale documented wrong — update the docs, not the design

BRANDING.md's type scale (40/30/24/20/16/14/12) doesn't match the designs. The designs have evolved their own scale organically: 32px detail titles, 28px wizard headlines, 26px CTA headline, 22px card titles. **The actual sizes feel right for mobile. The documented scale is the problem. Update BRANDING.md.**

Proposed revised scale:
```
Display:    32px  — page titles (turnout detail)
H1:         28px  — wizard step headlines
H2:         22px  — card titles, tile titles
H3:         17px  — trust block, emphasis
Body-sm:    15px  — article titles, descriptions
Small:      14px  — metadata, subtitles, labels
Caption:    13px  — location text, wordmark
Micro:      12px  — eyebrow labels, secondary
Nano:       11px  — section labels (use sparingly)
```

### Extended color palette is undocumented

These colors appear consistently across the product but aren't in BRANDING.md:

| Color | Role |
|-------|------|
| `#F0EDE8` | Secondary warm background (form zones, content areas) |
| `#7A6E65` | Secondary text / metadata |
| `#E5E0D8` | Warm border / divider |
| `#B5ADA8` | Placeholder text in inputs |
| `#DDD8D0` | Skeleton bars, "My Turnout" ghost title |
| `#5A8A6E` | Success toast (should derive from `#3D6B52`) |

Document these in BRANDING.md as the extended palette. `#6B6966` (used for Step 0 tile descriptions) overlaps with `#7A6E65` — consolidate to `#7A6E65`.

### Syne font for wordmark is undocumented

The "turnout.network" wordmark uses **Syne Bold 13px** across all nav bars. Syne appears nowhere in BRANDING.md. Either document it ("Wordmark typeface: Syne Bold") under the Wordmark/Logo section, or replace with Plus Jakarta Sans Bold.

---

## High Priority: Copy

### "FROM THE FIELD" → "WORTH READING"

"The field" is organizer jargon — NGO/military-coded. A 0-spectrum first-timer doesn't conceptualize their world as having "a field." The intent (signal real-world organizing context) is right; the phrase is insider language. Fix: **"WORTH READING"**.

### Article 2 front-loads the anxiety the product is supposed to dissolve

"First time at a protest? Here's what helped." — opens with "protest," the one word Bob might be anxious about. It's curated content on our homepage; we choose what to show. Fix: **"First time showing up? Here's what helped."** — same emotional hook, no protest-specific coding.

### OTP instruction is redundant with the line above it

Step 3.5: "We just texted you a 6-digit code." immediately followed by "Enter the 6-digit code we sent you." Two consecutive lines, same noun, same subject. Fix: keep the confirmation line, change the instruction to **"Type it in below."** — shorter, removes the repetition.

### "You're automatically RSVP'd to turn out." — two problems

1. **Jargon density.** "RSVP'd" and "turn out" in one sentence, both platform vocabulary Bob doesn't fully own yet.
2. **Brand verb misuse.** "Turn out" is transitive in this brand — you turn out your people. You don't turn out yourself. Bob doesn't turn out to his own planning meeting; he shows up. Other people turn out because he asked them to.

Fix: **"You're counted in, too."** or remove the secondary line entirely — he organized it, of course he's attending.

---

## High Priority: Handoff

### Missing annotations blocking implementation

- **OTP digit boxes** — no annotation for: WebOTP API one-tap autofill, `inputMode="numeric"`, auto-advance on digit entry, paste handling (full 6-digit paste), backspace behavior
- **InputPhone** — no annotation for: format validation, `+1` prefix behavior, the Chrome autocomplete bug (ICEBOX.md — autocomplete drops the `+`), international format
- **Cycling noun** — no annotation on the CTA card nodes for: word list (people / neighbors / friends / crew / community), animation type (fade or slide-up), timing. An engineer reading only the design file sees static "people" in amber.
- **Step 0 tile selection** — no annotation for: radio behavior, default state (new pre-selected?), is "Let's go" disabled until selection?
- **Share button** — no annotation for: Web Share API, clipboard fallback, content (URL only? URL + text?), desktop fallback

### "Icon Variant" cards use Inter — delete or convert

Component sheet contains three cards (`Carlos / Icon Variant`, `Kat / Icon Variant`, `Bob / Icon Variant`) that are standalone frames with `fontFamily: "Inter"` on titles and labels. Inter is not in the design system. An engineer referencing these instead of `GvjHS` (the real TurnoutCard) will implement with the wrong fonts. Delete these or convert to `GvjHS` refs.

### WizardLayout component exists but screens don't reference it

`WizardLayout` (`UWkzH`) has correct placeholder slots and is the right abstraction for implementation. The actual wizard screens duplicate its structure as standalone frames. Add annotation to `WizardLayout`: "implementation reference." Add annotation to wizard screens: "composition view — use WizardLayout component in code."

---

## Medium Priority

### Step 0 copy breaks the flow voice

- Headline "Which of these is you?" — survey language. Every other step headline is specific and action-oriented. Fix: **"How are you getting started?"** or cut the screen.
- Subtitle "Tell us where you're starting from." — switches to first-person-plural ("us"), breaking the second-person register every other subtitle uses. Fix: **"Everyone starts somewhere."** or drop the subtitle.

### Organizer status box fill is cool white

`eDHY0` (organizerStatus on turnout detail): `fill: "#F5F5F8"` — the cool, slightly-lavender white flagged in Round 1. Everything else is warm-tinted. Fix: `#F0EDE8` or `#FAFAF7`.

### Hardcoded values that should be variables

- Nav greens — three values, none tokenized. Define `--nav-bg` and `--header-bg`.
- Toast fill `#5A8A6E` — doesn't derive from `#3D6B52` (sage). Should be a tint of `--ring`.
- Skeleton color `#DDD8D0` — used in enough places to warrant `--skeleton`.
- `descriptionAffordance` fill `#F7F4EF` — maps to neither `--background` nor `--background-warm`. Use one of the two.

### Missing states for the discovery page

No empty state for zero turnouts. This is the literal launch-day state.

### "Preview" tab label is ambiguous

Bottom nav: Preview / RSVPs / Edit. "Preview" implies "see before publishing" but the turnout is already live. Fix: **"Details"** or **"Overview"**.

---

## What's Working — Do Not Touch

**The discovery headline with cycling noun.** "Here's how to turn out your people" — strongest copy in the product. Amber highlight, emotional anchor, hits differently for each reader. Do not change the concept, the color, or the cycling mechanic.

**"Claim your turnout."** Second-strongest copy. "Claim" implies the thing already exists and Bob just needs to grab it — psychologically removes the "am I doing something new" anxiety at the highest-friction moment.

**"Don't overthink it, you can always change it."** Best wizard subtitle. Direct, permission-giving, addresses the exact anxiety. Template for others.

**"Real name, nickname, or roll one."** Best placeholder. Eight words license three options. Die icon completes the affordance without explanation.

**"Create Turnout" as Step 3.5 CTA.** Correct vocabulary, correct weight, correct climax. Not "Submit," not "Finish" — "Create Turnout." Don't change it.

**The TurnoutPreview Ghost → Partial → Filled progression.** The emotional core of the wizard. Step 2 in particular — real venue photos, real date/time, skeleton names waiting to resolve — is the strongest design beat in the product.

**The coral ActionBar CTA.** Consistent across all wizard steps. Coral is doing exactly the right work as primary action affordance. No drift, no variation.

**The step header zone.** Sage green, Zilla Slab headline, 80% white subtitle, pips at the seam. Consistent, warm, established across all steps. The visual heartbeat of the wizard. Don't touch.

**The OTP digit boxes.** Tall, segmented, Zilla Slab numerals — the right amount of ceremony for the only security-critical step.

**The warm brown text system.** `#7A6E65` for secondary text is doing quiet, excellent work. Warm without muddy, readable without harsh. Correctly creates hierarchy against `#1E2420` primary.

**Direction C palette cohesion.** Despite the drift noted above, every screen reads as the same warm, human product. Passes all five anti-pattern tests cleanly (corporate SaaS ✗, government civic ✗, protest aesthetic ✗, startup-cute ✗, nonprofit-generic ✗).

**TurnoutCard component construction.** Eyebrow → title → metadata → photos. Consistent strokes, shadows, spacing. Photo strip with real venue images does exactly what it's supposed to.

**"One last step and it's yours."** The Round 2 fix landed perfectly. Proximity to completion, ownership transfer — correct emotional register.

**"Your number is only used for updates about your turnouts…"** Positive commitment framing. No defensive spam mention. Answers the real fear.

---

## Action List

### Fix before engineering handoff (blocking)
1. Design error states for ALL form inputs (border, message position/style, clear behavior)
2. Add loading/disabled button states (ContinueButton disabled, "Send code"/"Create Turnout" loading)
3. Add "Resend code" affordance on OTP screen
4. Annotate OTP digit boxes (WebOTP, `inputMode="numeric"`, auto-advance, paste, backspace)
5. Annotate InputPhone (format, `+1` prefix, Chrome autocomplete bug from ICEBOX.md)
6. Delete or convert "Icon Variant" cards (Inter fonts, not GvjHS refs)
7. Pick ONE nav dark green → tokenize as `--nav-bg`
8. Pick ONE amber → add to Direction C palette, apply everywhere

### Fix before public launch
9. Date/time placeholders → "This Friday" / "7:00 PM" _(outstanding since Round 1)_
10. Remove Step 0 for MVP, or hide disabled tile at minimum
11. Move "Add a description" below Share button; change accent from coral to sage/neutral
12. "FROM THE FIELD" section label → "WORTH READING"
13. Article 2 → "First time showing up? Here's what helped."
14. OTP instruction → "Type it in below."
15. "You're automatically RSVP'd to turn out." → "You're counted in, too."
16. Annotate cycling noun (word list, animation type, timing)
17. Update BRANDING.md type scale to match actual design sizes
18. Document extended color palette in BRANDING.md
19. Document Syne as wordmark font (or replace)
20. Toast color → derive from `#3D6B52` (define `--toast-bg`)
21. Organizer status box fill → `#F0EDE8` (kill `#F5F5F8`)
22. Design empty state for discovery page (zero turnouts)
23. Annotate WizardLayout as implementation reference; annotate wizard screens as composition views
24. Fix `--background` variable (remove `#F5F5F8` intermediate value)
25. Tokenize nav greens, toast fill, skeleton color

### Nice to have
26. Active tab indicator on bottom nav (underline or tint)
27. "Preview" tab label → "Details" or "Overview"
28. "Start a Turnout" → "Start Organizing" on Discovery CTA (test Bob's vocabulary vs. ours)
29. Organizer pill on Step 3.5 → annotate for engineers: resolves to typed name from Step 3
30. Step 0 (if kept): 35% opacity on disabled tile, first pip lit amber, selected-state background tint
31. Reduce pip diameter to 10-12px
32. `#6B6966` (Step 0 tile desc) → consolidate to `#7A6E65`
33. Group Dashboard border → `#E5E0D8` (fix `#E5E7EB` Tailwind default)
34. Test Step 3.5 preview card height on small phones (OTP input above fold?)
35. Annotate share button behavior (Web Share API, clipboard fallback, content, desktop)
36. Annotate "From the Field" link behavior (external links, hardcoded URLs in MVP)

---

_Generated from parallel four-agent review. Agents: UX flow & usability, visual design & aesthetics, copy & brand voice, maintainability & engineering handoff._
