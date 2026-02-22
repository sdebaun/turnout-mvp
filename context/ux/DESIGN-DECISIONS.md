# UX Design Decisions

Working notes on deliberate design choices — the reasoning behind them, not just the outcome.

---

## Turnout Cards

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

## Discovery Page

The discovery page cards are not Alice's primary flow — she arrives via a direct share link. The cards exist to give first-time visitors (Bob, early in his "should I try this?" research) evidence that real people are using the platform. The purpose is platform credibility, not event browsing. This affects how much we optimize for discovery-feed patterns versus turnout-page patterns.
