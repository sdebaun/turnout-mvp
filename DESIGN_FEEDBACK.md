# Design File Maintainability & Handoff Review

**File:** `context/ux/mvp-designs.pen`
**Perspective:** Maintainability & Handoff (4.x)
**Reviewers:** Jeeves · Tom Waits · Hunter S. Thompson · Malcolm Tucker
**Synthesized by:** Art Director

---

## Jeeves — Component Naming & Structural Consistency

*"I venture to suggest that several arrangements in the file, while producing the intended visual impression, are rather less orderly beneath the surface than one might hope."*

**4.1 Demo variant cards in `Component: Turnout Discovery Card` are standalone frames, not refs — and have the wrong font.**

The frame `FdsAQ` contains the canonical `TurnoutCard` component (`GvjHS`) and three demo variants named Carlos, Kat, and Bob. These three are `type: "frame"` — hand-drawn copies, not component instances. They share no structural connection with `GvjHS`. Worse: all three demo cards use `fontFamily: "Inter"` for the turnout title, while the actual `TurnoutCard` component and DESIGN-DECISIONS.md both require `fontFamily: "Zilla Slab"`. The "reference" cards are already wrong.

**Impact:** Engineers reading this frame will build against the wrong font. The demo cards will diverge permanently from the component on every future change.
**Fix:** Replace all three with `type: "ref"` instances pointing to `GvjHS` with appropriate `descendants` overrides.

---

**4.2 `topnav/authed` uses lowercase `topnav` while the other two variants use camelCase `topNav`.**

Component: TopNav (`nX0vo`) contains: `topNav/unauthed`, `topNav/focused`, `topnav/authed`. One character. Twenty minutes of late-night confusion. Tooling that searches for `topNav/authed` will find nothing.

**Impact:** Documentation, code comments, and search will fail on the third variant.
**Fix:** Rename `30iNU` from `topnav/authed` to `topNav/authed`.

---

**4.3 Group Dashboard (`UPxEN`) has a bespoke topNav, not a ref to the component.**

The `SYAqC` nav inside the Group Dashboard is `type: "frame"` — hand-drawn. The Discovery page correctly refs `topNav/unauthed`. The Turnout Detail correctly refs `topNav/authed`. The Group Dashboard is the odd one out, building its own nav from scratch.

**Impact:** When the authenticated topNav changes (and it will), the Group Dashboard won't update. Engineers building this screen will implement against a bespoke frame that doesn't reflect the actual component contract.
**Fix:** Replace `SYAqC` with a `type: "ref"` to `30iNU`.

---

**4.4 The `ActionBar` component's primary CTA button (`BApml`) is a bespoke frame, not a button component ref.**

`ActionBar` (`DSwrF`) contains a hand-built terracotta button `BApml` with hardcoded `#D95F3B` fill, hardcoded font, hardcoded corner radius. The shadcn system has `Button/Large/Default` (`C3KOZ`) and `Button/Large/Destructive` (`xPENL`) — both terracotta — neither of which is the source. Step 3.5 (`jUrLu`) further overrides this with a new bespoke frame `5cTFN` to say "Create Turnout."

**Impact:** Engineers have no component reference for the primary action button. The semantic label "Destructive" is wrong for "Continue" and "Create Turnout." Any style change to the CTA requires hunting every wizard step.
**Fix:** Replace `BApml` with a ref to an appropriate button component. Rename `Button/Destructive` to `Button/Primary` if terracotta is the brand's primary action colour, not a destructive semantic.

---

**4.5 TurnoutPreview's three states are independent reusable components, not variants of one.**

`p2ihv` (Ghost), `1K289` (Partial), and `trU6T` (Filled) are each `type: "frame"` with `reusable: true` set independently. They share overlapping structure but not shared origin. Internal element IDs differ throughout. Ghost already has a `height: 52` fixed title-wrap the others lack. Corner radius, gaps, and skeleton placeholder fills will drift further over time.

**Impact:** Engineers will implement three separate React components when the intent (per DESIGN-DECISIONS.md) is one component with conditional rendering. Three independent components will diverge under future changes.
**Fix:** Define one base `TurnoutPreview` component. Model states as conditional renders or annotate explicitly that these three are implementation-documentation artifacts, not separate component exports.

---

**4.6 The shadcn design system frame contains ~80 components, approximately 70 of which appear nowhere in the current screens.**

`MzSDs` contains Accordion, Tabs, Data Table, Sidebar, Pagination, Combobox, Tooltip, Modal variants, etc. None of these appear in Discovery, Wizard, Turnout Detail, or Group Dashboard. They are imported library weight.

**Impact:** A new designer or agent asked to "use the component library" will spend time on irrelevant components. When the shadcn library updates, all 80 components require attention.
**Fix:** Extract actually-used components to a project-specific component frame. Mark the shadcn frame clearly as "imported library — do not modify."

---

## Tom Waits — Color & Spacing Drift

*"The variable system is a note tucked in the pocket of a suit nobody's worn. They wrote it down. Just never spent it."*

**4.7 The token system exists and is being used 5 times. There are 250+ hardcoded hex values doing the work those tokens should be doing.**

The file defines `$--background`, `$--background-warm`, `$--foreground`, `$--border`, `$--primary`, and friends. `$--background-warm` appears 3 times. `$--background` twice. The other 250+ fills are raw hex. The system is there. It just isn't being trusted.

**Impact:** When the primary color changes, every component requires manual search-and-replace. The design file and codebase will drift apart quietly and permanently.
**Fix:** Either commit — normalize `#1E2420` → `$--foreground`, `#7A6E65` → `$--muted-foreground`, `#D95F3B` → `$--primary`, `#E5E0D8` → `$--border`, `#FAFAF7` → `$--background` — or stop defining variables you don't use.

---

**4.8 Two different nav greens: `#243D30` (wizard) vs. `#2F5441` (everything else). Undocumented.**

`topNav/focused` (`vLmOp`) uses `#243D30`. Every other nav uses `#2F5441`. The darker value might be intentional signaling ("you're in a task, the door's closed") or it might be drift. Nobody annotated which.

**Impact:** Engineers will implement both and not know which is canonical. Eventually someone picks one.
**Fix:** If intentional, annotate it. If not, normalize to one value and tokenize it.

---

**4.9 Group Dashboard bottom nav uses the wrong border color: `#E5E7EB` (shadcn cool gray) instead of `#E5E0D8` (brand warm beige).**

Turnout Detail bottomNav has the correct warm border. Group Dashboard bottomNav inherited the shadcn default and was never corrected. Close enough in a screenshot. Wrong in implementation against warm backgrounds.

**Fix:** Change `LFeac`'s stroke fill from `"#E5E7EB"` to `"#E5E0D8"` or `"$--border"`.

---

**4.10 Group Dashboard bottom nav uses Inter, not Plus Jakarta Sans.**

The Turnout Detail bottomNav correctly uses Plus Jakarta Sans on its tab labels. The Group Dashboard bottomNav uses Inter — the shadcn default, never overridden. Subtle enough to survive QA. Wrong enough to feel slightly off without anyone being able to name why.

**Fix:** Change Group Dashboard tab label font to `"Plus Jakarta Sans"`.

---

**4.11 `Select Group/Default` and `Combobox/Default` both have a phantom rotation of -0.13948 degrees.**

Both components sit at `x: 2100.160669376255` — the fractional x confirms the same accidental drag event. Not intentional. The canonical definition of these components is now slightly off-axis.

**Fix:** Set `rotation: 0` on `w5c1O` and `cCfrk`.

---

**4.12 The pip amber (`#C8831A`) is from brand Direction A (Warm Ground), which was not selected.**

`PipFilled` (`lmLHD`) uses `#C8831A` — the ochre from a color palette the brand guide explicitly presented as one of three options. The chosen palette uses `#D95F3B` (primary coral) and `#E8A020` (amber highlight). `#C8831A` is an orphan.

**Impact:** Engineers will implement `#C8831A` for the progress pip. Someone later will wonder why the pip doesn't match any other warm element in the UI. No trail back to origin.
**Fix:** Replace `#C8831A` in `lmLHD` with `#E8A020` (headline amber) or `#D95F3B` (primary) — decide which, then document it.

---

**4.13 `#8B7355` avatar placeholder color is undocumented and unreachable from the token system.**

The `TurnoutCard` base component has an organizer avatar with `fill: "#8B7355"`. This color appears nowhere else in the file, nowhere in the brand guide, nowhere in the variable system. Probably a placeholder for dynamic per-user coloring. Nobody said so.

**Fix:** Annotate the node: "Placeholder fill — avatar color is dynamic per-user in implementation." Or create a `--avatar-placeholder` token.

---

## Hunter S. Thompson — Annotation Quality & Completeness

*"Some rooms in this file are well-lit. Some are dark pits with no ladder and no rope. I've been in both."*

**4.14 The WizardLayout component itself (`UWkzH`) has zero annotation.**

The step variants all have excellent composition notes. The component that contains all the slots has nothing. An engineer building `WizardLayout` opens the component, sees five named slots, and has no documentation on: what the pip slot's absolute position (y:192) means, why it overlaps the header boundary, whether `topNav` is always `vLmOp`, or what the `enabled: false` on step 0's pip slot means.

**Fix:** Add a component-level context annotation to `UWkzH` explaining slot wiring, the pip overlap position, and the step-0 pip suppression behavior.

---

**4.15 `TurnoutPreview/Ghost` has a thin annotation; `/Partial` and `/Filled` have none.**

Ghost says "elements will basically fill in as the user enters the details." Partial and Filled say nothing. The field-to-slot mapping (which step fills which slot), the state transition trigger (step advance vs. field completion), and the skeleton-to-real render logic (conditional vs. component swap) are all undocumented on the components that encode them.

**Fix:** Add state-specific annotations to each of the three preview components documenting: trigger, field-slot mapping, and transition behavior. Reference DESIGN-DECISIONS.md explicitly so the document and design file point to each other.

---

**4.16 Critical InputLocation API notes are trapped on one instance, not on the component.**

The `locFld` instance in step 1 has a meticulous Google Places implementation note — including the specific `@vis.gl/react-google-maps` v1.7.1 gotcha about `PlaceAutocompleteClassic` not existing. This note will save four hours of debugging. It is attached to one instance inside one wizard step. The `InputLocation` component (`fd7ut`) itself has zero annotation. Any future use of this component — turnout edit flow, address confirmation — will find an empty component and have to rediscover everything the hard way.

**Fix:** Copy the Places API note from the J1dPK `locFld` instance directly onto the `fd7ut` component definition.

---

**4.17 `tile-new` annotation is thin — it documents the destination, not the mechanism.**

The `tile-new` context says "navigates the user down the newbie onboarding." What does tap actually do? Immediate step advance? State variable set? Different form fields on subsequent steps? The answer is implied but not stated. Engineers will guess.

*(Note: `tile-existing` is genuinely excellent — full Phase 2 lockout, data model explanation, explicit instruction not to design Cathy's path yet. That annotation is the model. Praise is warranted.)*

**Fix:** Add to `tile-new`: "On tap, advance to step 1. Sets wizard path = 'new'. No different database objects — the fork is UX register only (more hand-holding, AI name suggestions)."

---

**4.18 The step 3.5 OTP screen has two redundant confirmation labels with no explanation.**

`smsConfirmLabel` ("We just texted you a 6-digit code.") and `otpLabel` ("Enter the 6-digit code we sent you.") are both visible, both rendered, both saying the same thing. No annotation. Every engineer who sees this will assume it's a design accident and delete one. They'll be right 50% of the time.

**Fix:** Annotate to clarify intent. If both are static: say so, and explain why two sentences. If one is a transient confirmation that auto-dismisses: design that state. If one is redundant: delete it.

---

**4.19 `QWxuG` uses `layout: none` (absolute positioning) with no screen-level documentation.**

Elements are positioned at y:0, y:56, y:688, y:756, y:636. What scrolls, what's fixed, what's portal-rendered — all invisible from the data without careful reconstruction. The toast annotation is exemplary (the best single annotation in the file). The screen-level layout contract is nowhere.

*(Note: The toast implementation note on `40o90` is exemplary — specific, implementation-complete, anticipates the exact failure mode of layout shift. This is what all annotations should aspire to.)*

**Fix:** Add a screen-level context annotation to `QWxuG`: "layout:none (absolute). Structure: sticky topNav (y:0, 56px), scrolling content area (y:56–688), fixed shareBar (y:688, 56px), fixed bottomNav (y:756, 56px). Toast renders via React portal at viewport top — not in scroll flow."

---

## Malcolm Tucker — Missing States & Implementation Gaps

*"Happy path only. The design file is beautiful on the happy path. It doesn't exist on any other path. And the happy path is the one that almost never needs the most help."*

**4.20 The Phase 2 tile has no disabled state — it is a tap target that silently does nothing.**

`tile-existing` (Jpt17) is visually present in step 0. It has no lock indicator, no "Coming soon" label, no visual disabled state, no tap feedback. A user who taps it will receive no response. On mobile, they'll assume the app broke.

**Severity: Must have before implementation.**
**Fix:** Either hide the tile entirely in code, or design a disabled/locked state. Minimum: reduced opacity + "Coming soon" label. Preferred: a tooltip on tap.

---

**4.21 TurnoutPreview transition logic contradicts itself between the design file and DESIGN-DECISIONS.md.**

DESIGN-DECISIONS.md says: "Skeleton → real is a simple conditional render on field value presence." Three named components in the design file (`Ghost`, `Partial`, `Filled`) imply three discrete swap points. Engineers will ask: do I swap components when advancing steps, or re-render the same component when fields are filled? The design file says one thing. The documentation says another. No answer exists.

**Severity: Must have before implementation.**
**Fix:** Pick one. If field-level conditional (the correct answer given the live-binding intent), annotate all three preview states as "implementation documentation artifacts — implement as one component with conditional rendering, not three component exports."

---

**4.22 Zero error states exist for any form field in any wizard step.**

InputDate, InputTime, InputLocation, InputText — one state each: placeholder. No error stroke, no error label, no inline error text. The architecture doc specifies rate limiting and validation. The design doesn't show what happens when any field fails.

**Severity: Must have before implementation.**
**Fix:** Design and document at minimum: error stroke color, error label color, inline error text placement. Use `#D95F3B` — it's already in the palette.

---

**4.23 The turnout detail screen only shows the organizer post-creation view. The participant view doesn't exist.**

Alice's entire journey terminates at a screen that wasn't designed. The participant view of the turnout detail — RSVP button, read-only description, no organizer status, no share bar (or a different share bar), different bottom nav tabs — none of this exists in the file.

**Severity: Must have before implementation.** Alice's journey is the primary validation metric.
**Fix:** Design the public participant turnout detail view. It is not a variant of the organizer view — it is a different screen.

---

**4.24 Group Dashboard has one turnout in the list and no empty state.**

Bob creates his group. He hasn't made a turnout yet. The dashboard shows him... nothing designed for that state.

**Severity: Known gap, document it.** Engineers can make reasonable decisions here.
**Fix:** Annotate the `turnoutList` with: "Empty state: needs design. Fallback: center 'Create your first turnout' CTA in the list container."

---

**4.25 Discovery page has no zero-turnout state and no authenticated-user variant.**

MVP launch day: the database is empty. Someone navigates to the homepage. Nothing is designed for what they see. Also: a returning Alice who is authenticated sees the same page as a first-time anonymous visitor — the design doesn't address what changes when she's logged in.

**Severity: Must have before implementation (zero-turnout). Known gap (authenticated).**
**Fix:** Design a zero-turnout state for the discovery page. Document the authenticated variant as a known gap with the expectation that the nav changes at minimum.

---

**4.26 The OTP step (step 3.5) has no error state, no resend affordance, no rate-limit state.**

Six digit boxes, all happy. What happens when: the code is wrong, the code expires (10-minute window per the architecture doc), the SMS doesn't arrive, the network fails during verification? None of this is designed. The "Create Turnout" button has no loading or failure state.

**Severity: Must have before implementation.** Wrong codes are guaranteed. SMS delays are routine.
**Fix:** Design minimum: error state for digit boxes (red stroke + error message below). Add "Resend code" affordance that appears after timeout. Document loading/failure states for the submit button.

---

## Synthesis — The Adult in the Room

Here's what I see when I look at all of this together.

**The architecture is genuinely good.** WizardLayout as a slotted layout component, TurnoutPreview as a live-bound artifact, the step composition pattern with JSX pseudocode — these are solid design system thinking. Whoever built this knew what they were doing. The best annotations (the toast, the Jpt17 lockout, the locFld Places note) are best-in-class. The instinct was right.

**The execution has two distinct problems, and they're different in nature.**

*Problem one: structural debt that's already wrong.* The demo cards with Inter instead of Zilla Slab. The phantom rotations. The two different nav greens. The Group Dashboard bottomNav with the wrong border and wrong font. These aren't gaps — they're errors. A developer implementing from these artifacts will build wrong things. These get fixed before handoff, not after.

*Problem two: incomplete design coverage.* No error states. No participant turnout view. No zero-turnout discovery. No disabled state for the Phase 2 tile. No OTP error. These are genuine missing screens. The design is all happy path. Real users will not be that cooperative.

**What I want us to do with this:**

1. The **quick fixes** (font on demo cards, nav green documentation, bottomNav border/font, phantom rotation, pip amber decision) — these are one pass through the file, maybe two hours. We should do them.

2. The **structural fixes** (demo cards → refs, Group Dashboard topNav → ref, TurnoutPreview → one component, ActionBar button → component ref) — these are a proper design system refactor session. Half a day. Worth it before any engineering work starts.

3. The **missing states** — I'm going to prioritize ruthlessly. Before engineering touches a feature, we need: error states for all form fields, the participant turnout detail view, and the OTP error state. The others (empty dashboard, zero-turnout discovery, authenticated discovery) are known gaps we document and let engineers make reasonable decisions on, then retroactively design once we see what they built.

4. The **annotation gaps** — the WizardLayout component-level annotation, TurnoutPreview state documentation, InputLocation component annotation, the step 3.5 double label — these are an afternoon of writing, not designing. We do them as part of the structural refactor pass.

**The token system abandonment is the one thing I want to sit with you on.** Tom Waits is right that 250+ hardcoded hex values against a nearly-unused token system is a maintenance nightmare. But it's also not free to fix — every component in the file would need touching. My recommendation: tokenize the five most common values (`$--foreground`, `$--muted-foreground`, `$--primary`, `$--border`, `$--background`) as a minimum, and do it as part of the structural refactor pass so we're only opening each component once.

---

**Issue Priority Summary**

| Code | Issue | Severity | Pass |
|------|-------|----------|------|
| 4.1 | Demo cards wrong font + not refs | 🔴 Blocking | Structural refactor |
| 4.4 | ActionBar CTA not a component ref | 🔴 Blocking | Structural refactor |
| 4.5 | TurnoutPreview: 3 separate components | 🔴 Blocking | Structural refactor |
| 4.21 | TurnoutPreview transition logic ambiguity | 🔴 Blocking | Annotation pass |
| 4.22 | No form field error states | 🔴 Blocking | New design work |
| 4.23 | Participant turnout view missing | 🔴 Blocking | New design work |
| 4.26 | OTP error + resend missing | 🔴 Blocking | New design work |
| 4.20 | Phase 2 tile: no disabled state | 🟠 Pre-ship | New design work |
| 4.3 | Group Dashboard bespoke topNav | 🟠 Pre-ship | Structural refactor |
| 4.9 | Wrong border color on dashboard nav | 🟠 Pre-ship | Quick fix |
| 4.10 | Wrong font on dashboard nav | 🟠 Pre-ship | Quick fix |
| 4.12 | Pip amber from wrong palette | 🟠 Pre-ship | Quick fix |
| 4.14 | WizardLayout has no annotation | 🟠 Pre-ship | Annotation pass |
| 4.16 | InputLocation note not on component | 🟠 Pre-ship | Annotation pass |
| 4.19 | QWxuG layout:none undocumented | 🟠 Pre-ship | Annotation pass |
| 4.25 | Discovery: no zero-turnout state | 🟠 Pre-ship | New design work |
| 4.2 | topnav/authed naming | 🟡 Housekeeping | Quick fix |
| 4.7 | Token system abandoned | 🟡 Housekeeping | Structural refactor |
| 4.8 | Two nav greens undocumented | 🟡 Housekeeping | Annotation pass |
| 4.11 | Phantom rotation on components | 🟡 Housekeeping | Quick fix |
| 4.13 | Undocumented avatar color | 🟡 Housekeeping | Quick fix |
| 4.15 | TurnoutPreview state annotations missing | 🟡 Housekeeping | Annotation pass |
| 4.17 | tile-new annotation thin | 🟡 Housekeeping | Annotation pass |
| 4.18 | OTP double label unexplained | 🟡 Housekeeping | Annotation pass |
| 4.24 | Dashboard empty state | 🟡 Housekeeping | Annotate as known gap |
| 4.6 | Unused shadcn components | 🟢 Nice to have | Structural refactor |

---

*Generated by art director synthesis of maintainability/handoff review.*
*Agents: Jeeves (component consistency), Tom Waits (color drift), Hunter S. Thompson (annotation quality), Malcolm Tucker (missing states).*
