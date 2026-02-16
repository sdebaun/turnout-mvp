# turnout.network Ubiquitous Language

This is a reference glossary for terms and structures in turnout.network, designed for both technical agents and human-facing applications.

## Group

A named organizing entity containing multiple turnouts and managed by one or more organizers. Represents an ongoing organizing effort—whether a goal-oriented campaign, mutual aid network, community project, or any collective action. Examples include "Save Willow Creek" (fighting a gravel mine), "Local Love Project" (food distribution), or "North Avenue Tool Library" (resource sharing).

**Organizer relationship:** Users can be organizers of a group (either created it or were added as collaborators). Group organizers can create turnouts within that group and manage existing turnouts. This enables collaboration—multiple people can share the work of running an ongoing organizing effort.

In MVP, groups start with one organizer creating one turnout. The group/turnout distinction becomes visible when collaboration is added (co-organizers can create additional turnouts for the group).

## Turnout

An organizing effort within a group—like a protest, food distribution program, or community meeting. Has a primary location and time for display and discovery. Individual opportunities within the turnout may have different meeting locations nearby (e.g., a protest starting at a coffee shop but marching to City Hall, or a food distribution with stations at different buildings in the same complex). Contains one or more opportunities that define specific ways to participate. Examples include "Climate March" (location: City Park, time: Saturday 2pm), "Food Distribution" (location: Fairgrounds Building A, time: Saturday 10am), or "Planning Meeting" (location: Joe's Coffee, time: Thursday 7pm). The term emphasizes active mobilization—you don't just attend a turnout, you turn out and make it happen.

**Organizer relationship:** The user who creates a turnout is its organizer. In the future, turnouts may have multiple co-organizers who share management responsibilities. Turnout organizers can manage RSVPs, check-ins, and send updates for that specific turnout.

## Location

The answer to "where do I need to be?" for participants. Can be physical (with coordinates and address for navigation) or virtual (with meeting link to join). Physical locations enable "Get Directions" to buildings, parks, or street corners. Virtual locations enable "Join Meeting" for video calls. Locations are reusable across turnouts and opportunities, ensuring consistency when the same place is used repeatedly. Examples: "Fairgrounds Building A" (physical), "Planning Call Zoom Room" (virtual), "Main St & 5th Ave intersection" (physical meeting point).

## Opportunity

A specific way to participate in a turnout. Defines where to meet (meeting location), when to meet (meeting time), and optionally what role to fill. Participants RSVP to a specific opportunity, which creates an engagement. Examples include: "Show Up" (simple: inherits turnout's location/time, no role), "Morning shift at Fairgrounds" (time variation: different time, same location), "Setup crew at Parking Lot B" (location variation: different location, different time), or "Street Medic - meet at Main & 5th, 1:30pm" (full specification: location, time, role). Opportunities can have limits or be open-ended.

## User

A person interacting with the platform, identified by phone number and display name. Display names can be randomly generated (e.g., "BlueWombat") or user-chosen. Users act as participants when committing to turnouts, and as organizers when creating or managing groups and turnouts. "Participant" and "organizer" are usage patterns, not distinct database flags—the same user can organize one turnout and participate in another.

## RSVP

Both an action and a state. As an action: a user commits to an opportunity. As a state: the engagement is confirmed and the user intends to participate. RSVPing creates an engagement record and triggers reminders.

## Check-in

Both an action and a state. As an action: a user marks themselves present at a turnout. As a state: the engagement is marked as attended. Check-in validates follow-through and enables measurement of RSVP-to-attendance conversion.

## Reminder

A scheduled notification about an upcoming turnout, sent via SMS or push notification. Reminders help users follow through on commitments by prompting confirmation or providing directions.

## Engagement

An engagement begins when a user RSVPs to an opportunity. It records what actually happens: confirmed, canceled, checked in, or no-show. Each engagement is a micro-log of one person's interaction with one opportunity. Engagements may be public or private, and can inform social transparency, accountability, and future coordination.

## Participant

A usage pattern: a user who commits to a turnout by RSVPing to an opportunity. Participants can be anonymous (random display names) or identified (real names). The same user can be a participant in some turnouts and an organizer in others.

## Organizer

A usage pattern: a user who creates or manages groups and turnouts. Users can be organizers at two levels:

**Group organizer:** Can create turnouts within the group and manage existing turnouts. Becomes a group organizer by either creating the group or being added as a collaborator.

**Turnout organizer:** Manages a specific turnout (defines opportunities, sends invites, manages check-ins, views engagement histories). Becomes a turnout organizer by creating it within a group they organize.

The same user can be an organizer for some groups/turnouts and a participant in others. In MVP, the person who creates a group becomes both a group organizer and the organizer of the first turnout. Collaboration features (adding co-organizers to groups) come in the Next phase.

## Testimonial

A short, visible statement one user can leave about another, based on shared work in a turnout. Testimonials reflect trust and experience—not status or endorsement. They appear on public profiles when enabled and help support trust-building across the network.

## Profile

An optional, participant-controlled record of public engagements and testimonials. A profile is not a self-authored identity—it emerges from action and recognition. Profiles help organizers discover reliable collaborators and give participants a way to reflect their own history of showing up.
