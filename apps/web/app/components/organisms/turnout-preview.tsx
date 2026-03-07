'use client'

import React from 'react'
import { differenceInCalendarDays, format } from 'date-fns'
import { CalendarIcon, MapPinIcon } from '../atoms/icons'
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

// Parse YYYY-MM-DD at local noon to avoid DST-boundary day shifts
function parseDateStr(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0)
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  // dummy date — only the time portion matters for formatting
  return format(new Date(2000, 0, 1, h, m), m === 0 ? 'h a' : 'h:mm a')
}

function formatDate(dateStr: string): string {
  const date = parseDateStr(dateStr)
  const diff = differenceInCalendarDays(date, new Date())
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff > 1 && diff < 7) return `This ${format(date, 'EEEE')}`
  return format(date, 'MMM d')
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
        <CalendarIcon
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
        <MapPinIcon
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
