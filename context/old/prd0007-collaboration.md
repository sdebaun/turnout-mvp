# PRD0007: Group-Level Co-Organizer Collaboration

**Status:** MVP
**Owner:** TBD
**Dependencies:** [@prd0006-group-dashboard.md](./prd0006-group-dashboard.md)

---

## Purpose

Prevent organizer burnout and single-point-of-failure by enabling group-level collaboration. Allow multiple organizers to share responsibility for managing moments within a group.

## User

Bob (group organizer) - created "Save Willow Creek" group, wants to add Jane and Tom to help manage the ongoing organizing effort.

## Flow

**From group dashboard:**
```
Save Willow Creek
Organizers: You (Bob)  [+ Add Co-Organizer]
```

**Bob clicks "+ Add Co-Organizer":**
1. Modal appears: "Add co-organizer to Save Willow Creek group"
2. "Enter their phone number"
3. Bob enters Jane's number
4. Submit → SMS sent to Jane:
   ```
   Turnout: Bob added you as co-organizer for "Save Willow Creek".
   You can now help manage all moments in this group.
   Tap to access: [magic link]
   ```
5. Jane clicks → "Save Willow Creek" group now appears in Jane's group list
6. Jane has full access to the group:
   - View all moments (upcoming and past)
   - Create new moments
   - Manage RSVPs for any moment
   - Edit any moment details
   - Add/remove other co-organizers
   - Delete moments or the group

## Why Group-Level (Not Moment-Level)

- Bob's organizing an ongoing effort ("Save Willow Creek"), not just one event
- Adding Jane once gives her access to all moments (past, present, future)
- Jane can help create new moments without Bob having to re-add her each time
- Prevents Bob from being a single point of failure
- Reduces friction for ongoing organizing efforts

## Permissions (MVP - Keep It Simple)

**All group organizers have equal permissions:**
- No "owner" vs "editor" distinction
- Any organizer can add/remove other organizers
- Any organizer can delete moments or the entire group

**Why no roles for MVP:**
- Bob's user story (user-stories.md) shows "group chat with five friends" — this is trusted collaboration, not hierarchical
- Adding RBAC before we know if people actually misuse equal permissions is premature optimization
- If a bad actor deletes everything, we'll know we need permissions. Until then, keep it simple.
- Post-MVP: Add owner/admin/editor roles if abuse becomes a real problem

## Data Model

**group_organizers table (join table):**
- `group_id` (foreign key to groups)
- `organizer_id` (foreign key to users)
- `added_at` (timestamp)
- `added_by` (foreign key to users - who added this organizer)

**Queries:**
- Dashboard shows all groups where `organizer_id = current_user`
- Co-organizers can access all moments in groups they belong to

## Out of Scope

- No role-based permissions (owner/admin/editor)
- No approval flow (added organizers get immediate access)
- No notifications to other organizers when someone is added/removed
- No audit log of who did what (just track who added whom)
- No ability to transfer ownership (all organizers are equal)

## Success Criteria

- Organizers can add co-organizers in <30 seconds
- Added co-organizers receive magic link SMS immediately
- Co-organizers see shared group in their group list after clicking magic link
- No permission errors when co-organizers try to manage moments
- If bad actors abuse equal permissions, we'll know to add roles in Next phase

## Analytics to Track

- % of groups with >1 organizer (adoption of collaboration feature)
- Average number of organizers per group
- % of moments created by non-founding organizers (distribution of work)
- Whether groups with multiple organizers create more moments (collaboration effect)

## Related PRDs

- Group dashboard: prd0006
- First-time group creation: prd0002
- Organizer authentication: prd0001
