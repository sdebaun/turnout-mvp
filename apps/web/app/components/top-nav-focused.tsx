'use client'

// Focused variant of TopNav for wizard/task flows.
// Centered wordmark only, darker forest background.
// Fully client-safe: no server data needed, no async ops.
// Isolated from top-nav.tsx (Server Component) to avoid silently demoting
// Server Component imports that are used by client components.
export function TopNavFocused() {
  return (
    <nav className="sticky top-0 z-10 h-14 flex items-center justify-center bg-forest flex-shrink-0">
      <span className="font-syne font-bold text-[13px] text-offwhite tracking-[0.01em]">
        turnout.network
      </span>
    </nav>
  )
}
