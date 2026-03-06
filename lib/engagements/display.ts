/**
 * Softens raw RSVP count into a display string.
 *
 * Why soften at all?
 * - "2 people are going" can make a turnout look small and deter participation.
 * - "Be the first to RSVP!" is an invitation, not a confession of emptiness.
 * - At 10+, showing exact counts enables gaming ("I'll RSVP once 30 others do").
 *   Rounding down to nearest 5 keeps the claim strictly true ("Over 20" when 23 are going).
 *
 * Thresholds are constants — easy to tune after launch once we see how they affect behavior.
 */
export function formatRsvpCount(count: number): string {
  if (count < 5) return 'Be the first to RSVP!'
  if (count < 10) return `${count} people are going`

  // Math.floor((count - 1) / 5) * 5 guarantees the softened value is strictly less than count.
  // Examples: 10 → 5, 11 → 10, 15 → 10, 16 → 15, 23 → 20, 100 → 95
  const softened = Math.floor((count - 1) / 5) * 5
  return `Over ${softened} people are going`
}
