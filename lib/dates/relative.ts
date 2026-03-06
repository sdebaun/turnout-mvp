import { differenceInCalendarDays, format } from 'date-fns'

/**
 * Converts a date into a human-readable relative string for display.
 * Called SERVER-SIDE and the result passed as a prop — this avoids
 * hydration mismatches between server and client clock readings.
 *
 * "This Friday · 7 PM" is decision-relevant. "Fri, Feb 27 @ 7:00 PM PST" makes
 * you reach for a calendar. The relative format matches how people actually talk.
 *
 * @param date - The date to format
 * @param now - Reference point (defaults to current time; injectable for testing)
 */
export function formatRelativeDate(date: Date, now = new Date()): string {
  const diffDays = differenceInCalendarDays(date, now)

  if (diffDays === 0) return `Today · ${format(date, 'h:mm a')}`
  if (diffDays === 1) return `Tomorrow · ${format(date, 'h:mm a')}`
  if (diffDays <= 6) return `This ${format(date, 'EEEE')} · ${format(date, 'h:mm a')}`
  if (diffDays <= 13) return `Next ${format(date, 'EEEE')} · ${format(date, 'h:mm a')}`
  return format(date, 'MMM d · h:mm a')
}
