'use client'

import React from 'react'
import { Calendar, MapPin } from 'lucide-react'
import { GroupPill, OrganizerPill } from '../atoms/turnout-pills'

interface TurnoutPreviewProps {
  groupName?: string      // if present: real group pill, else skeleton
  turnoutTitle?: string   // if present: real title, else "My Turnout" ghost
  displayName?: string    // if present: real organizer pill, else skeleton (always skeleton for now)
  date?: string           // YYYY-MM-DD
  time?: string           // HH:MM (24-hour)
  locationName?: string   // venue name
  locationCity?: string   // "City ST" derived from formattedAddress
}

// Formats HH:MM into a human-readable time like "7 PM" or "10:30 AM"
function formatTime(time: string): string {
  const [hourStr, minuteStr] = time.split(':')
  const hour = parseInt(hourStr, 10)
  const minute = parseInt(minuteStr, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  if (minute === 0) return `${displayHour} ${ampm}`
  return `${displayHour}:${minuteStr} ${ampm}`
}

// Formats YYYY-MM-DD as human-relative text when within 7 days,
// otherwise as a short formatted date. Parses directly to avoid timezone drift.
function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  // Local noon prevents DST-boundary day shifts
  const date = new Date(year, month - 1, day, 12, 0, 0)
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const diffDays = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays > 1 && diffDays < 7) {
    return `This ${date.toLocaleDateString('en-US', { weekday: 'long' })}`
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}


export function TurnoutPreview({
  groupName,
  turnoutTitle,
  displayName,
  date,
  time,
  locationName,
  locationCity,
}: TurnoutPreviewProps) {
  // Date row: show as soon as date is entered, even without time.
  // If both date+time: "This Friday · 7 PM". If only date: "This Friday". If only time: "7 PM".
  const hasDate = Boolean(date)
  const hasTime = Boolean(time)
  const hasLocation = Boolean(locationName)

  let dateTimeText: string | null = null
  if (hasDate && hasTime) {
    dateTimeText = `${formatDate(date!)} · ${formatTime(time!)}`
  } else if (hasDate) {
    dateTimeText = formatDate(date!)
  } else if (hasTime) {
    dateTimeText = formatTime(time!)
  }

  const locationText = hasLocation
    ? locationCity
      ? `${locationName}, ${locationCity}`
      : locationName!
    : null

  return (
    // rounded-xl on mobile; sharp on desktop (sidebar butts against the viewport edge)
    // ring-1 gives an inset-style border without affecting layout box size
    <div
      className="rounded-xl lg:rounded-none bg-white p-[14px_16px] flex flex-col gap-2 ring-1 ring-sage/20"
      data-testid="turnout-preview-card"
    >
      {/* Eyebrow row: group pill + organizer pill — skeleton when name not yet entered */}
      <div className="flex items-center gap-2 flex-wrap">
        <GroupPill name={groupName} />
        <OrganizerPill name={displayName} />
      </div>

      {/* Turnout title — "My Turnout" ghost color (#DDD8D0) when not yet entered.
          Ghost color matches skeleton bars so the title slot reads as part of the skeleton pattern. */}
      <h2
        className={`font-heading font-bold text-[20px] leading-tight m-0 ${
          turnoutTitle ? 'text-charcoal' : 'text-skeleton'
        }`}
        aria-hidden={!turnoutTitle}
      >
        {turnoutTitle || 'My Turnout'}
      </h2>

      {/* Date/time row — icon is sand-colored when ghost, terracotta when filled */}
      <div className="flex items-center gap-1.5">
        <Calendar
          size={14}
          strokeWidth={1.75}
          className={`flex-shrink-0 ${dateTimeText ? 'text-terracotta' : 'text-sand'}`}
          aria-hidden="true"
        />
        {dateTimeText ? (
          <span className="text-sm text-charcoal font-sans">{dateTimeText}</span>
        ) : (
          <div className="w-[110px] h-3 rounded bg-skeleton" aria-hidden="true" />
        )}
      </div>

      {/* Location row — same icon pattern as date row */}
      <div className="flex items-center gap-1.5">
        <MapPin
          size={14}
          strokeWidth={1.75}
          className={`flex-shrink-0 ${locationText ? 'text-terracotta' : 'text-sand'}`}
          aria-hidden="true"
        />
        {locationText ? (
          <span className="text-sm text-charcoal font-sans">{locationText}</span>
        ) : (
          <div className="w-[140px] h-3 rounded bg-skeleton" aria-hidden="true" />
        )}
      </div>

      {/* Photo strip — always 3 skeleton rects. Photo fetch is future work. */}
      <div className="flex gap-1 h-[70px]" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex-1 rounded-md bg-skeleton" />
        ))}
      </div>
    </div>
  )
}
