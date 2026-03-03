'use client'

import { useRef, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { logoutAction } from '@/app/auth/actions'

interface NavAvatarDropdownProps {
  initials: string
  displayName: string
}

export function NavAvatarDropdown({ initials, displayName }: NavAvatarDropdownProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function handleSignOut() {
    startTransition(async () => {
      await logoutAction()
      router.refresh()
    })
  }

  return (
    <div ref={containerRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 rounded-full bg-avatar-bg flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
        aria-label="Account menu"
        aria-expanded={open}
      >
        <span className="text-[13px] font-semibold font-sans text-white">{initials}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-offwhite border border-separator rounded-lg shadow-lg z-20 overflow-hidden">
          <div className="px-4 py-3 border-b border-separator">
            <p className="text-xs text-sand font-sans">Signed in as</p>
            <p className="text-sm font-medium text-charcoal font-sans truncate">{displayName}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isPending}
            className="w-full text-left px-4 py-3 text-sm font-sans text-terracotta hover:bg-warm transition-colors disabled:opacity-50"
          >
            {isPending ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  )
}
