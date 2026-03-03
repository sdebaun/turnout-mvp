# UX Design Decisions

Working notes on deliberate design choices — the reasoning behind them, not just the outcome.

---

## Creation Flow

### Live-building preview card

The creation wizard shows a `TurnoutPreview` card between the green header and the form inputs on every step. This card is not decorative — it is a live-bound read-only render of the form state, updating in real time as the user fills in each field.

**Skeleton bars** are the zero-value placeholder for each field: rounded warm-sand rectangles at approximate text width, no words. As a field receives a value, its skeleton bar dissolves and the real content appears.

**Data sequence across steps:**
- Step 1 (when/where): date, time, and location fill in live. When location is set, Google Places photos load into the photo strip.
- Step 2 (name it): group name and turnout name fill in live. Eyebrow pills appear as names are entered.
- Step 3 (auth): organizer name fills in as the user sets their display name.

**Three static design states** (for design file representation only):
- `TurnoutPreview/Ghost` — start of step 1, all skeleton
- `TurnoutPreview/Partial` — start of step 2, logistics real, names skeleton, photos real
- `TurnoutPreview/Filled` — start of step 3, everything real

The card anatomy mirrors the public turnout card: eyebrow pills (group + organizer), title, date/time row, location row, photo strip. Bob is watching the shareable artifact take shape before he's finished building it.

**Implementation note:** This requires the preview component to subscribe to form state. Each field maps directly to a slot in the card. Skeleton → real is a simple conditional render on field value presence, not a three-state enum.

**"My Turnout" ghost title:** Both `TurnoutPreview/Ghost` and `TurnoutPreview/Partial` use "My Turnout" as the title placeholder text, colored `#DDD8D0` — the same fill as the skeleton bars. This makes "My Turnout" visually part of the skeleton pattern rather than readable placeholder text. At flow-screen scale it reads as a text-shaped ghost element, not as words. Do not change it to a more readable color like `#B5ADA8` — the intent is that the title slot looks skeleton until a real title is entered.

---

### Expertise fork — both tiles active, Path 2 fast-following

The creation flow opens with an expertise fork: "Starting something new" (Bob) vs "Already organizing" (Cathy). The core principle is sound — a first-time organizer benefits from AI suggestions, default turnout type recommendations, and reassurance copy; an experienced organizer finds that same scaffolding patronizing and wants a cleaner, more direct setup experience.

**Both paths create identical Group + Turnout objects.** This is not a data branch — it's an onboarding register branch. The difference is in how much hand-holding, suggestion, and guidance the flow provides.

**Both tiles are rendered at full opacity and are interactive.** Path 2 (Cathy) design is coming shortly after Path 1 ships — the intent is to implement both in close succession. Do not disable or dim the "Already organizing" tile. Do not treat it as a placeholder. Engineers should wire up navigation for both tiles; the Path 2 wizard screens will follow.

Path 1 (Bob) is fully designed and is the initial implementation. Path 2 (Cathy) design is in progress.

---

## Turnout Cards

### Title typography: Zilla Slab everywhere

Turnout titles use Zilla Slab Bold in both the `TurnoutCard` (discovery feed) and the `TurnoutPreview` components (wizard). The display font signals that the title is the name of a real thing — an event worth showing up for — not a form field or calendar entry. Plus Jakarta Sans flattens that signal. The hierarchy is: small Plus Jakarta Sans eyebrow → Zilla Slab title → Plus Jakarta Sans metadata. Do not revert the discovery card title to Plus Jakarta Sans.

### Information hierarchy

The card leads with an eyebrow (group avatar + name, organizer avatar + name), then title, then when and where as icon rows. This order is deliberate: "Kickoff Meeting" without context is meaningless — you need to know it's for Save Willow Creek before the title lands. The eyebrow solves that. When and where come after the title because they're confirmation details, not the hook.

Photos sit at the bottom as supporting evidence, not the headline. The decision-making content (what, who, when, where) leads. The photos say "yes, this is real, here's the place." That's the right role for them.

### Photos: venue images, not hero uploads

We auto-populate the photo strip from Google Places photos (or Street View fallback). We do not force organizers to upload a hero image, and we dont even ask new organizers. This is intentional — requiring an upload violates the "2 minutes to your first turnout" promise, and Bob at 11pm with a group chat and a gravel mine grievance doesn't have a designed promotional flyer. Consistent auto-populated venue photos across all cards beat the Mobilize pattern of occasionally great organizer images mixed with frequent nothing.

Google Places photos also do something a generic hero image can't: locals recognize the venue immediately. "Handlebar Coffee" with actual interior shots gives spatial anchoring that "Ventura, CA" never could.

### Venue name over city

We show venue name + city ("Handlebar Coffee, Ventura CA"), not just city. This came directly from looking at Mobilize, which shows only city-level location. Venue specificity is meaningfully more useful for the actual decision someone is making: is this on my way, do I know this place, is it worth showing up?

### Human-relative time

"This Friday · 7 PM" rather than "Fri, Feb 27 @ 7:00 PM PST." The relative framing is warmer, faster to scan, and more decision-relevant. You don't need to mentally calculate whether Feb 27 is this week.

### Tap affordance

The card shape, shadow, and rounded corners imply tappability on mobile — users have been conditioned by a decade of touchscreens. We don't need an explicit "See details →" button (looking at you, Mobilize). On desktop, a hover state (cursor change, subtle shadow lift) handles the affordance. That's a CSS concern, not a design decision.

### Card height consistency

Titles can vary in length. Rather than truncating to one line, we set a minimum header height so all cards share the same baseline before the info section begins. Variable card heights in a feed look janky; consistent baselines don't.

---

## Discovery Page / MVP Mobile Home

### What this page is for right now

The MVP home page is not a discovery experience — it's a credibility page. The primary visitor is an organizer (Bob) who found turnout.network somehow and wants to know if this is real before he sends a link to his group chat. The page needs to answer one question in the first three seconds: *do real people use this?*

Alice's primary flow is a direct share link to a specific turnout — she rarely lands here cold. The home page is Bob's page.

The long-term vision is something closer to a Kickstarter home page: surfacing active turnouts by location, time, and cause so that people can discover things worth showing up for. That requires critical mass of turnouts to be worth building. For now, the page earns its keep through social proof, not browsing.

### Three-zone layout

The page is structured as three distinct visual zones:

**Green sticky nav** — sage green (`#3D6B52`) with white wordmark. Sticky so it's always present as you scroll. The green is the most consistent brand signal in the product — every screen has it. Establishes identity before anything else loads.

**Dark CTA card** — charcoal background, designed to sit in a card grid on desktop but promoted to the top of the stack on mobile. The card leads with the headline and lands on the cycling noun (see below). Full-width primary button. Dark background differentiates it naturally from the turnout cards below without needing special treatment.

**Turnout card feed** — real active turnouts. Light background, photo strips, the full card component. Their job is to show Bob that *this is a real thing people are doing*, not that he should browse and RSVP to something. Credibility through specificity: real venues, real times, real group names.

### The CTA card: card-in-grid, not hero

On desktop, the "Start a turnout" card will sit in the turnout card grid as a peer — one slot in the grid is the call to action. This is a deliberate choice: it says "this is what you could be doing, alongside everyone else doing it." Not a separate hero section, not a marketing banner. A peer card with a different job.

On mobile, single-column stacking promotes it to the top of the feed. The dark background does the work of differentiating it without needing a different component for mobile vs. desktop.

### Headline: cycling noun

The CTA headline is:

> It's time to
> turn out your
> **people**

The word "people" is highlighted in amber and cycles through alternatives: *neighbors*, *friends*, *crew*, *community*. Each word hits a different person differently — Bob sees "friends" and thinks of his group chat, someone else sees "neighbors" and thinks of their street. The cycling word is the emotional landing point of the sentence and the visual anchor of the card.

In the static design, "people" is shown in amber to represent the interaction intent. Implementation uses a CSS word-swap animation (fade or slide-up).

### "From the Field" section

Three curated links to third-party articles about organizing, showing up, and tools. Not testimonials, not platform content — external editorial that signals "this platform exists in a world of real organizing, not a startup vacuum." Categories (ORGANIZING / SHOWING UP / TOOLS) map loosely to where someone might be in the 0–3 activation spectrum.

In MVP these are hardcoded. Eventually they could be a simple CMS or even a manually updated list. The point is human curation, not algorithmic feed.
