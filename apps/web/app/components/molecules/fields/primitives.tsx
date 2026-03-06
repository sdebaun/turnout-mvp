import type { ReactNode } from 'react'

export const INPUT_CLASSES = 'flex-1 min-w-0 border-none outline-none bg-transparent text-sm text-charcoal font-normal font-sans placeholder:text-sand'

export function IconInputWrapper({ icon, children, className }: { icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg bg-white px-3 py-2.5 border border-sage/30 ${className ?? ''}`}>
      {icon && <span className="text-muted flex-shrink-0" aria-hidden="true">{icon}</span>}
      {children}
    </div>
  )
}

export function LabeledField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-muted font-sans">{label}</label>
      {children}
    </div>
  )
}
