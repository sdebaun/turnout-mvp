'use client'

import { CalendarIcon } from '@/app/components/atoms/icons'
import { IconInputWrapper, LabeledField, INPUT_CLASSES } from './primitives'

function getTodayString() {
  return new Date().toISOString().split('T')[0]
}

export function DateField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <LabeledField label="Date">
      <IconInputWrapper icon={<CalendarIcon />}>
        <input
          type="date"
          value={value}
          min={getTodayString()}
          onChange={(e) => onChange(e.target.value)}
          // showPicker() makes the entire input area clickable — not just the (hidden) indicator
          onClick={(e) => { try { (e.currentTarget as any).showPicker() } catch {} }}
          // [color-scheme:light] prevents dark-mode browsers from inverting date picker chrome
          className={`${INPUT_CLASSES} [color-scheme:light]`}
          data-testid="turnout-date"
        />
      </IconInputWrapper>
    </LabeledField>
  )
}
