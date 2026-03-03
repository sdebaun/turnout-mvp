/**
 * Browser autocomplete sometimes strips the leading + from E.164 numbers.
 * Normalize by prepending + to any all-digit string, leaving everything else
 * (already-normalized +1234, partial input, empty string) unchanged.
 */
export function normalizePhone(val: string): string {
  return /^\d+$/.test(val) ? `+${val}` : val
}
