import { Phone } from 'lucide-react'
import { IconInputWrapper, LabeledField, INPUT_CLASSES } from './primitives'
import { normalizePhone } from '@/lib/phone'

export function PhoneField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <LabeledField label="Phone number">
      <IconInputWrapper icon={<Phone size={16} strokeWidth={1.75} />}>
        <input
          type="tel"
          value={value}
          placeholder="+1 (555) 000-0000"
          onChange={(e) => {
            // Browser autocomplete sometimes strips the leading + from E.164 numbers.
            onChange(normalizePhone(e.target.value))
          }}
          autoComplete="tel"
          className={INPUT_CLASSES}
          data-testid="phone-number"
        />
      </IconInputWrapper>
    </LabeledField>
  )
}
