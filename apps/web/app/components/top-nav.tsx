import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { NavAvatarDropdown } from './nav-avatar-dropdown'
import { NavSignInButton } from './nav-sign-in-button'

// Three nav variants matching the design system:
//
// focused — wizard/task flows. Centered wordmark only. Darker bg (#243D30 = forest).
//           No navigation chrome — user is mid-task, back lives in the action bar.
//
// public  — discovery + any public screen (authenticated or not).
//           Wordmark left. Right: avatar dropdown if logged in, ghost Sign in if not.
//           Lighter bg (#2F5441 = pine).
//
// authed  — organizer turnout detail. Left: back chevron + group name (contextual
//           breadcrumb, not generic "back"). Right: avatar dropdown.
//           Lighter bg (#2F5441 = pine).

function getInitials(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean)
  return words.length >= 2
    ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
    : displayName.slice(0, 2).toUpperCase()
}

type TopNavProps =
  | { variant: 'focused' }
  | { variant: 'public'; user?: { displayName?: string | null } | null }
  | { variant: 'authed'; backLabel: string; backHref: string; displayName: string }

export function TopNav(props: TopNavProps) {
  if (props.variant === 'focused') {
    return (
      <nav className="sticky top-0 z-10 h-14 flex items-center justify-center bg-forest flex-shrink-0">
        <span className="font-syne font-bold text-[13px] text-offwhite tracking-[0.01em]">
          turnout.network
        </span>
      </nav>
    )
  }

  if (props.variant === 'public') {
    const { user } = props
    const displayName = user?.displayName ?? null

    return (
      <nav className="sticky top-0 z-10 h-14 flex items-center justify-between bg-pine flex-shrink-0 px-4">
        <span className="font-syne font-bold text-[13px] text-offwhite tracking-[0.01em]">
          turnout.network
        </span>
        {displayName ? (
          <NavAvatarDropdown initials={getInitials(displayName)} displayName={displayName} />
        ) : (
          <NavSignInButton />
        )}
      </nav>
    )
  }

  // authed — back breadcrumb + avatar dropdown
  const { backLabel, backHref, displayName } = props
  return (
    <nav className="sticky top-0 z-10 h-14 flex items-center justify-between bg-pine flex-shrink-0 px-4">
      <Link
        href={backHref}
        className="flex items-center gap-1 text-offwhite hover:text-offwhite/80 transition-colors"
      >
        <ChevronLeft size={18} strokeWidth={2} />
        <span className="text-[15px] font-medium font-sans">{backLabel}</span>
      </Link>
      <NavAvatarDropdown initials={getInitials(displayName)} displayName={displayName} />
    </nav>
  )
}
