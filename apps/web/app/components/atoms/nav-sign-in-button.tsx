'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthModal } from '@/app/auth/components/auth-modal'

export function NavSignInButton() {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="text-[13px] font-medium font-sans text-offwhite border border-offwhite/40 rounded-md px-3 py-1.5 hover:bg-white/10 transition-colors cursor-pointer"
      >
        Sign in
      </button>
      <AuthModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </>
  )
}
