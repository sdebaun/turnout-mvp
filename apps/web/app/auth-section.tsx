'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AuthModal } from './auth/components/auth-modal'
import { logoutAction } from './auth/actions'
import type { User } from '@prisma/client'

interface AuthSectionProps {
  user: User | null
}

export function AuthSection({ user }: AuthSectionProps) {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleLogout() {
    startTransition(async () => {
      await logoutAction()
      router.refresh()
    })
  }

  if (user) {
    return (
      <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg">
        <span className="text-green-800">
          Signed in as <strong>{user.displayName}</strong>
        </span>
        <button
          onClick={handleLogout}
          disabled={isPending}
          className="text-sm text-red-600 hover:text-red-800 underline disabled:opacity-50"
        >
          {isPending ? 'Logging out...' : 'Logout'}
        </button>
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="bg-blue-600 text-white rounded-md py-2 px-6 font-medium hover:bg-blue-700"
      >
        Sign In / Sign Up
      </button>
      <AuthModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}
