# PRD0002: Group & Moment Creation Flow

**Status:** MVP
**Owner:** TBD
**Dependencies:** [@prd0001-phone-identity.md](./prd0001-phone-identity.md)

---

## Purpose

Enable first-time organizers to create a group and their first moment in a single, frictionless flow.

## User

Bob (first-time organizer) - wants to organize a protest about a gravel mine destroying a local creek.

## User Flow

1. Land on turnout.network
2. Click "Start Organizing" (no login required)
3. See single form with all fields (ordered for psychological flow: vision → action → identity):

   **Your group:**
   - "What are you organizing for?" (text, required) → group mission/cause
   - "What are you calling your group?" (auto-suggested from above, editable) → group name (e.g., "Save Willow Creek")
   - _Serotonin bump: Bob creates something meaningful_

   **Your first moment:**
   - "What's happening?" (pre-filled "First Planning Meeting", editable) → moment name
   - "Details" (optional, text area) → moment description
   - "Where?" (location text input, geocoded for maps/directions)
   - "When?" (date + time picker, local time)
   - _Serotonin bump: Bob creates a real, concrete event_

   **Who are you?**
   - "Your name" (random pseudonym pre-filled, editable) → organizer display name
   - "Your phone number" (required, uses phone-based identity system)
     - Help text: "We'll text you a link to manage 'Save Willow Creek' and share your moment"
   - _Cognitive burden saved for last, when Bob is already invested_

4. Click "Create & Share" → Form data captured (group/moment NOT created yet)
5. SMS sent via phone-based identity system:
   ```
   Turnout: Click to confirm and create your moment "[Moment Name]": [magic link]
   ```
6. Click magic link → Group + moment created NOW, Bob authenticated
7. Dashboard shows:
   - "Your moment is live!"
   - Shareable link: `turnout.network/m/[short-id]`
   - RSVP count (currently 0)
   - Quick share buttons (copy link, SMS, etc.)

## Form Field Requirements

**Group mission (What are you organizing for?):**
- Type: Text input
- Validation: Required, 10-500 characters
- Used to auto-suggest group name

**Group name (What are you calling your group?):**
- Type: Text input
- Auto-suggested from mission field (can be edited)
- Validation: Required, 3-100 characters
- Displayed in dashboard, SMS messages

**Organizer name (Who are you?):**
- Type: Text input
- Pre-filled: Random pseudonym (e.g., "GreenWombat")
- User can reroll or edit
- Validation: Required, 1-50 characters

**Phone number:**
- Type: Tel input
- Validation: Valid phone format, required
- Used for magic link auth

**Moment name (What's happening?):**
- Type: Text input
- Pre-filled: "First Planning Meeting"
- Validation: Required, 3-200 characters

**Moment description (Details):**
- Type: Textarea
- Validation: Optional, max 2000 characters

**Location (Where?):**
- Type: Text input
- Geocoded server-side for maps/directions
- Validation: Required, 5-500 characters

**Date/Time (When?):**
- Type: Date + time picker
- Validation: Required, must be in future
- Stored as UTC, displayed in local time

## Out of Scope

- No group branding (logos, colors, about pages)
- No public group pages (moments are public, groups are internal)
- No multiple opportunities per moment (just "Show Up")
- No moment templates (just freeform)
- No group-level settings (beyond name and organizers)

## Implementation Notes

- Form data (group name, moment details, organizer info) encoded in magic link token
- Token has 15-min expiry (same as all magic links from prd0001)
- If Bob doesn't click within 15min, form data expires (he'd need to fill out form again)
- This prevents spam/abuse (no DB writes until phone verified)

## Outputs (After Magic Link Click)

- Organizer created (if new phone number) or retrieved (if returning)
- Group created with provided name and mission
- Moment created in group with provided details
- Group-Organizer relationship created
- Shareable URL generated: `turnout.network/m/[short-id]`
- Bob authenticated and shown dashboard

## Success Criteria

- 90%+ form completion rate (users who start form complete it)
- <2 min average time from landing page to "moment is live"
- 95%+ magic link click rate (users who submit form click SMS)
- Zero duplicate groups/moments (all creation happens after phone verification)

## Related PRDs

- Subsequent moment creation covered in prd0006 (Group Dashboard)
- Creating a new group follows this same flow (no separate PRD needed)
