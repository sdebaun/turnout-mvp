import { fromZonedTime } from 'date-fns-tz'

/**
 * Convert a local date + time + IANA timezone into a UTC Date.
 * Uses the IANA timezone name (not a numeric offset) so DST is handled
 * correctly — an event on March 15 created on March 1 gets March 15's
 * offset, not March 1's.
 */
export function toUTCDate(date: string, time: string, timezone: string): Date {
  return fromZonedTime(`${date}T${time}:00`, timezone)
}
