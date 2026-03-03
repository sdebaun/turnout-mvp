'use client'

import React from 'react'

interface TurnoutPreviewProps {
  groupName?: string      // if present: real group pill, else skeleton
  turnoutTitle?: string   // if present: real title, else "My Turnout" ghost
  displayName?: string    // if present: real organizer pill, else skeleton
  date?: string           // YYYY-MM-DD
  time?: string           // HH:MM (24-hour)
  locationName?: string   // venue name
  locationCity?: string   // city, state
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
// otherwise as a short formatted date. Avoids timezone shenanigans by
// parsing the date string directly rather than letting Date() interpret it.
function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  // Local noon to avoid DST edge cases
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

// A rounded placeholder bar — stands in for any text that isn't filled in yet.
function SkeletonBar({ width = 'w-32', height = 'h-4' }: { width?: string; height?: string }) {
  return (
    <div
      className={`${width} ${height} rounded-full`}
      style={{ backgroundColor: '#DDD8D0' }}
      aria-hidden="true"
    />
  )
}

// Eyebrow pill for the group name
function GroupPill({ name }: { name: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ backgroundColor: '#FAF4E8', color: '#3D6B52', border: '1px solid #DDD8D0' }}
    >
      {name}
    </span>
  )
}

// Eyebrow pill for the organizer name
function OrganizerPill({ name }: { name: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ backgroundColor: '#FAF4E8', color: '#1E2420', border: '1px solid #DDD8D0' }}
    >
      {name}
    </span>
  )
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
  const hasDateTime = date && time
  const hasLocation = locationName

  const formattedLocation = hasLocation
    ? locationCity
      ? `${locationName}, ${locationCity}`
      : locationName
    : null

  return (
    <div
      className="rounded-xl overflow-hidden shadow-sm"
      style={{ backgroundColor: 'white', border: '1px solid #DDD8D0' }}
    >
      {/* Card header */}
      <div className="px-4 pt-4 pb-3 space-y-2">
        {/* Eyebrow: group + organizer pills */}
        <div className="flex flex-wrap gap-1.5">
          {groupName ? (
            <GroupPill name={groupName} />
          ) : (
            <SkeletonBar width="w-24" height="h-5" />
          )}
          {displayName ? (
            <OrganizerPill name={displayName} />
          ) : (
            <SkeletonBar width="w-20" height="h-5" />
          )}
        </div>

        {/* Turnout title — "My Turnout" ghost when nothing filled, real title when filled */}
        {turnoutTitle ? (
          <h2
            className="font-heading font-bold text-lg leading-tight"
            style={{ color: '#1E2420' }}
          >
            {turnoutTitle}
          </h2>
        ) : (
          <h2
            className="font-heading font-bold text-lg leading-tight"
            style={{ color: '#DDD8D0' }}
            aria-hidden="true"
          >
            My Turnout
          </h2>
        )}

        {/* Date/time row */}
        <div className="flex items-center gap-2">
          <span style={{ color: '#DDD8D0' }}>📅</span>
          {hasDateTime ? (
            <span className="text-sm font-medium" style={{ color: '#1E2420' }}>
              {formatDate(date)} · {formatTime(time)}
            </span>
          ) : (
            <SkeletonBar width="w-36" height="h-3.5" />
          )}
        </div>

        {/* Location row */}
        <div className="flex items-center gap-2">
          <span style={{ color: '#DDD8D0' }}>📍</span>
          {formattedLocation ? (
            <span className="text-sm font-medium" style={{ color: '#1E2420' }}>
              {formattedLocation}
            </span>
          ) : (
            <SkeletonBar width="w-40" height="h-3.5" />
          )}
        </div>
      </div>

      {/* Photo strip — 3 skeleton rectangles for MVP.
          Photos would come from Google Places API when placeId is available,
          but for now we keep them skeleton to avoid extra API surface in this PR. */}
      <div
        className="flex gap-1.5 px-4 pb-4"
        aria-hidden="true"
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex-1 h-16 rounded-lg"
            style={{ backgroundColor: '#DDD8D0' }}
          />
        ))}
      </div>
    </div>
  )
}
