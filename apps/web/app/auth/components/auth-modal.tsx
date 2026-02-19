'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { PhoneInputForm } from './phone-input-form'
import { DisplayNameForm } from './display-name-form'
import { OTPInputForm } from './otp-input-form'

type Step = 'phone' | 'displayName' | 'otp'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  body?: string
}

export function AuthModal({
  isOpen,
  onClose,
  title = 'Sign In or Sign Up',
  body,
}: AuthModalProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [displayName, setDisplayName] = useState<string | undefined>()

  // Reset state when modal closes so re-opening starts fresh
  const handleClose = useCallback(() => {
    setStep('phone')
    setPhone('')
    setDisplayName(undefined)
    onClose()
  }, [onClose])

  const handleNewUser = useCallback((p: string) => {
    setPhone(p)
    setStep('displayName')
  }, [])

  const handleReturningUser = useCallback((p: string) => {
    setPhone(p)
    setStep('otp')
  }, [])

  const handleDisplayNameSubmit = useCallback((name: string) => {
    setDisplayName(name)
    setStep('otp')
  }, [])

  const handleAuthSuccess = useCallback(() => {
    handleClose()
    router.refresh()
  }, [handleClose, router])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        // Close on backdrop click
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {body && (
          <p className="text-sm text-gray-600 mb-4">{body}</p>
        )}

        {step === 'phone' && (
          <PhoneInputForm
            onNewUser={handleNewUser}
            onReturningUser={handleReturningUser}
          />
        )}

        {step === 'displayName' && (
          <DisplayNameForm
            phone={phone}
            onSuccess={handleDisplayNameSubmit}
          />
        )}

        {step === 'otp' && (
          <OTPInputForm
            phone={phone}
            displayName={displayName}
            onSuccess={handleAuthSuccess}
          />
        )}
      </div>
    </div>
  )
}
