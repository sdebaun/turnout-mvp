'use client'

// Generic tile-selection atom — one option selected at a time from a list of 2–4.
// Each option has a colored left accent bar and an optional selection ring.
//
// Tailwind purges dynamic class strings, so accent colors map to static class sets
// rather than being constructed at runtime (e.g. `bg-${accent}` would be stripped).

export interface OptionItem {
  value: string
  label: string
  description: string
}

interface OptionGroupProps {
  options: OptionItem[]
  value: string
  onChange: (value: string) => void
}

export function OptionGroup({ options, value, onChange }: OptionGroupProps) {
  return (
    <div className="flex flex-col gap-3">
      {options.map((option) => {
        const isSelected = option.value === value

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex text-left w-full bg-white border-0 p-0 cursor-pointer rounded-sm ${
              isSelected ? 'ring-2 ring-amber' : 'ring-2 ring-transparent'
            }`}
          >
            {/* Bar and label are amber when selected, sage/charcoal when not */}
            <div className={`w-1.5 self-stretch flex-shrink-0 ${isSelected ? 'bg-amber' : 'bg-sage'}`} />
            <div className="p-5 flex flex-col gap-3 flex-1">
              <div className={`text-[22px] font-bold font-sans ${isSelected ? 'text-amber' : 'text-charcoal'}`}>
                {option.label}
              </div>
              <div className="text-[15px] font-normal text-tiletext font-sans">
                {option.description}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
