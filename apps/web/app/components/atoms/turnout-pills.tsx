// GroupPill and OrganizerPill — shared between the wizard preview card and public turnout page.
// Pass no name to get a skeleton placeholder in the exact same layout position.

export function GroupPill({ name }: { name?: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1">
      <div className={`w-4 h-4 rounded-sm flex-shrink-0 ${name ? 'bg-sage flex items-center justify-center' : 'bg-skeleton'}`}>
        {name && <span className="text-[9px] font-bold text-white font-sans">{name.charAt(0).toUpperCase()}</span>}
      </div>
      <span className={name ? 'text-xs font-medium text-muted font-sans' : 'inline-block w-[70px] h-2.5 rounded bg-skeleton'}>
        {name ?? ''}
      </span>
    </div>
  )
}

export function OrganizerPill({ name }: { name?: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1">
      <div className={`w-4 h-4 rounded-full flex-shrink-0 ${name ? 'bg-muted flex items-center justify-center' : 'bg-skeleton'}`}>
        {name && <span className="text-[9px] font-bold text-white font-sans">{name.charAt(0).toUpperCase()}</span>}
      </div>
      <span className={name ? 'text-xs font-medium text-muted font-sans' : 'inline-block w-[70px] h-2.5 rounded bg-skeleton'}>
        {name ?? ''}
      </span>
    </div>
  )
}
