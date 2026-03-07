import { IconInputWrapper, LabeledField, INPUT_CLASSES } from './primitives'
import { generateRandomName } from '@/lib/names'

export function DisplayNameField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <LabeledField label="Your name">
      {/* flex-1 on wrapper so it fills available width; reroll button is fixed 48px */}
      <div className="flex gap-2">
        <IconInputWrapper className="flex-1 min-w-0">
          <input
            type="text"
            value={value}
            maxLength={50}
            placeholder="Real name, nickname, or roll one"
            onChange={(e) => onChange(e.target.value)}
            className={INPUT_CLASSES}
            data-testid="display-name"
          />
        </IconInputWrapper>
        <button
          type="button"
          title="Generate a random name"
          onClick={() => onChange(generateRandomName())}
          className="flex-shrink-0 w-12 h-12 rounded-lg bg-offwhite border border-sage/30 flex items-center justify-center text-xl cursor-pointer"
          aria-label="Generate random name"
        >
          🎲
        </button>
      </div>
    </LabeledField>
  )
}
