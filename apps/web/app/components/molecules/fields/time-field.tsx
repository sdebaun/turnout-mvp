'use client'

import { Clock } from 'lucide-react'
import { IconInputWrapper, LabeledField, INPUT_CLASSES } from './primitives'

export function TimeField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <LabeledField label="Time">
      <IconInputWrapper icon={<Clock size={16} strokeWidth={1.75} />}>
        <input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => { try { (e.currentTarget as any).showPicker() } catch {} }}
          // [color-scheme:light] prevents dark-mode browsers from inverting time picker chrome
          className={`${INPUT_CLASSES} [color-scheme:light]`}
          data-testid="turnout-time"
        />
      </IconInputWrapper>
    </LabeledField>
  )
}
