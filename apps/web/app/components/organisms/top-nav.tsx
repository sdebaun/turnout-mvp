import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { NavAvatarDropdown } from './nav-avatar-dropdown'
import { NavSignInButton } from '../atoms/nav-sign-in-button'

// Two variants:
//
// focused — wizard/task flows. Centered wordmark, no chrome, darker forest bg.
//           Back lives in the action bar so there's no nav chrome here.
//
// default — all other screens. Pine bg, justify-between.
//           Left: back chevron + label if provided, else wordmark.
//           Right: avatar dropdown if user present, else sign-in button.

function getInitials(displayName: string) {
  const words = displayName.trim().split(/\s+/)
  return words.length >= 2
    ? (words[0][0] + words.at(-1)![0]).toUpperCase()
    : displayName.slice(0, 2).toUpperCase()
}

type TopNavProps =
  | { variant: 'focused' }
  | { variant?: never; user?: { displayName?: string | null } | null; backLabel?: string; backHref?: string }

export function TopNav(props: TopNavProps) {
  if (props.variant === 'focused') {
    return (
      <nav className="sticky top-0 z-10 h-14 flex items-center justify-center bg-forest flex-shrink-0">
        <Link href="/" className="font-syne font-bold text-[13px] text-offwhite tracking-[0.01em]">
          turnout.network
        </Link>
      </nav>
    )
  }

  const { user, backLabel, backHref } = props
  const displayName = user?.displayName ?? null

  return (
    <nav className="sticky top-0 z-10 h-14 flex items-center justify-between bg-pine flex-shrink-0 px-4">
      {backLabel && backHref ? (
        <Link
          href={backHref}
          className="flex items-center gap-1 text-offwhite hover:text-offwhite/80 transition-colors"
        >
          <ChevronLeft size={18} strokeWidth={2} />
          <span className="text-[15px] font-medium font-sans">{backLabel}</span>
        </Link>
      ) : (
        <span className="font-syne font-bold text-[13px] text-offwhite tracking-[0.01em]">
          turnout.network
        </span>
      )}
      {displayName ? (
        <NavAvatarDropdown initials={getInitials(displayName)} displayName={displayName} />
      ) : (
        <NavSignInButton />
      )}
    </nav>
  )
}
