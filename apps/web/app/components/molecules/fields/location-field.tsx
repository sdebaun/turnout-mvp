import { LabeledField } from './primitives'
import { LocationInput } from '../location-input'
import type { LocationData } from '@/app/organize/schemas'

export function LocationField({ value, onChange }: { value: LocationData | null; onChange: (v: LocationData | null) => void }) {
  return (
    // LocationInput is a Google Maps web component (shadow DOM) — must NOT be wrapped
    // in IconInputWrapper. The component manages its own input styling entirely.
    <LabeledField label="Location">
      <LocationInput value={value} onChange={onChange} />
    </LabeledField>
  )
}
