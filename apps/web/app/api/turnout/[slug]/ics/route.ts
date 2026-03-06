import { NextRequest } from 'next/server'
import { getTurnoutBySlug } from '@/lib/groups'

// RFC 5545 §3.3.11 — escape commas, semicolons, backslashes in text values.
// Newlines in text fields use the \n escape sequence (literal backslash-n).
function escapeIcs(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

// Format a JS Date as YYYYMMDDTHHMMSSZ (UTC, no separators) per RFC 5545 §3.3.5
function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const turnout = await getTurnoutBySlug(params.slug)
  if (!turnout) {
    return new Response('Not found', { status: 404 })
  }

  // endsAt is nullable — default to 2 hours after start when not set.
  // Two hours is a reasonable fallback that avoids calendar apps showing
  // the event as an instant-long slot.
  const endsAt = turnout.endsAt ?? new Date(turnout.startsAt.getTime() + 2 * 60 * 60 * 1000)

  const host = request.headers.get('host') ?? 'turnout.network'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const url = `${protocol}://${host}/t/${turnout.slug}`

  // Prefer formattedAddress for navigation; fall back to the short name.
  const location = turnout.primaryLocation.formattedAddress ?? turnout.primaryLocation.name

  // Prefer the turnout's own description; fall back to the group's mission statement.
  const description = escapeIcs(turnout.description ?? turnout.group.mission ?? '')

  // RFC 5545 §3.6 — lines end with CRLF
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//turnout.network//TDD0003//EN',
    'BEGIN:VEVENT',
    `UID:${turnout.id}@turnout.network`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(turnout.startsAt)}`,
    `DTEND:${formatIcsDate(endsAt)}`,
    `SUMMARY:${escapeIcs(turnout.title)}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${escapeIcs(location ?? '')}`,
    `URL:${url}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    `DESCRIPTION:Reminder: ${escapeIcs(turnout.title)} starts in 1 hour`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  return new Response(icsContent, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="turnout-${params.slug}.ics"`,
    },
  })
}
