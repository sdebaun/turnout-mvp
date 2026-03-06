import { IconInputWrapper, LabeledField, INPUT_CLASSES } from './primitives'

interface TextInputFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  maxLength?: number
  'data-testid'?: string
}

export function TextInputField({ label, value, onChange, placeholder, maxLength, 'data-testid': testId }: TextInputFieldProps) {
  return (
    <LabeledField label={label}>
      <IconInputWrapper>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className={INPUT_CLASSES}
          data-testid={testId}
        />
      </IconInputWrapper>
    </LabeledField>
  )
}
