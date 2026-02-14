# PRD0006: Group Dashboard

**Status:** MVP
**Owner:** TBD
**Dependencies:** [@prd0001-phone-identity.md](./prd0001-phone-identity.md), [@prd0002-group-moment-creation.md](./prd0002-group-moment-creation.md)

---

## Purpose

Enable organizers to manage their groups, view moments, track RSVPs, and create new moments.

## User

Bob (returning organizer) - created "Save Willow Creek" group, wants to manage it and create additional moments.

## Dashboard Entry Points

**If Bob has one group:**
- After login (via magic link), goes directly to that group's dashboard
- No group selection screen

**If Bob has multiple groups (or is co-organizer on others' groups):**
- Shows multi-group selection screen first
- Bob selects which group to manage

## Multi-Group Selection Screen

```
Your Groups

┌─ Save Willow Creek ────────────────────────┐
│ 3 upcoming moments • You + 2 organizers    │
│ [Open Group]                               │
└────────────────────────────────────────────┘

┌─ Community Garden Project ─────────────────┐
│ 1 upcoming moment • You + 1 organizer      │
│ [Open Group]                               │
└────────────────────────────────────────────┘

[+ Start New Group]
```

**Card contents:**
- Group name
- Count of upcoming moments
- Count of organizers (including Bob)
- "Open Group" button

**"Start New Group" button:**
- Returns to prd0002 (Group & Moment Creation Flow)
- Creates a new group with first moment

## Group Dashboard

```
Save Willow Creek
Organizers: Bob, Jane, Tom  [+ Add Co-Organizer]

┌─ Upcoming Moments ─────────────────────────┐
│ Melt ICE Protest                           │
│ Feb 18, 2026 • 23 RSVPs • 0 checked in     │
│ [Manage]                                   │
│                                            │
│ First Planning Meeting                     │
│ Today at 6pm • 5 RSVPs • 0 checked in      │
│ [Manage]                                   │
└────────────────────────────────────────────┘

┌─ Past Moments ─────────────────────────────┐
│ Kickoff Meeting                            │
│ Feb 10, 2026 • 8 RSVPs • 6 showed (75%)    │
│ [View]                                     │
└────────────────────────────────────────────┘

[+ Create New Moment]
```

**Header:**
- Group name
- List of organizers (display names)
- [+ Add Co-Organizer] button (see prd0007)

**Upcoming Moments section:**
- Shows moments with `start_time > now`
- Sorted by start time (soonest first)
- For each moment:
  - Moment name
  - Date/time
  - RSVP count
  - Check-in count
  - [Manage] button → goes to Single-Moment Dashboard

**Past Moments section:**
- Shows moments with `start_time < now`
- Sorted by start time (most recent first)
- For each moment:
  - Moment name
  - Date
  - RSVP count
  - Check-in count + percentage ("6 showed (75%)")
  - [View] button → goes to read-only moment view

**[+ Create New Moment] button:**
- Opens "Create New Moment" form (see below)

## Create New Moment Form (Subsequent Moments)

**Triggered by:** [+ Create New Moment] button from group dashboard

**Form fields:**
- "What's happening?" (text, required) → moment name
- "Details" (textarea, optional) → moment description
- "Where?" (text, required) → location
- "When?" (date + time picker, required) → start time

**On submit:**
- Moment created in current group
- Organizers automatically assigned (all group organizers)
- Returns to group dashboard
- Shows shareable link immediately

**Note:** This is simpler than first-time creation (prd0002) because:
- Group already exists
- Organizer already authenticated
- No phone verification needed

## Single-Moment Dashboard

**Triggered by:** [Manage] button from group dashboard

**Moment overview section:**
- Moment name (editable)
- Date, time, location (editable before moment starts)
- Group name (read-only)
- Organizers list (all group organizers have access)
- Edit button (can change details if moment hasn't started)

**RSVP list:**
- Table/list of participants
- Columns:
  - Name (or pseudonym)
  - Phone number (masked: `(555) ***-**89`)
  - RSVP timestamp
  - Status: Confirmed | Canceled | Checked In | No-Show | Late
- Sortable by status, timestamp
- Searchable by name

**Stats:**
- Total RSVPs (count)
- Checked in / Total (e.g., "15 / 23 (65%)")
- Cancellations (count)

**Actions:**
- "Send Message" → Opens form to send SMS to all confirmed participants
- "Export CSV" → Downloads RSVP list as CSV
- "Check In" (next to each participant name) → Manually check in participant (see prd0005)

**Shareable link:**
- Display: `turnout.network/m/[short-id]`
- Copy button
- Quick share buttons (SMS, email, etc.)

## Out of Scope

- No analytics/graphs (just raw numbers)
- No moment templates or bulk operations
- No group-level stats across all moments (e.g., "total RSVPs across all moments")
- No calendar view of moments
- No drag-and-drop moment reordering

## Success Criteria

- Organizers can create a new moment in <1 min
- Dashboard loads in <2 seconds
- RSVP list updates in real-time (or with manual refresh)
- Organizers can find specific participant in <10 seconds (via search)
- CSV export works in all major spreadsheet apps

## Related PRDs

- First-time group creation: prd0002
- Adding co-organizers: prd0007
- Checking in participants: prd0005
