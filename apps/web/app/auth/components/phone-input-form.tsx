'use client'

import { useState, useTransition } from 'react'
import { checkPhoneAction, sendOTPAction } from '../actions'
import { normalizePhone } from '@/lib/phone'

interface PhoneInputFormProps {
  onNewUser: (phone: string) => void
  onReturningUser: (phone: string) => void
}

export function PhoneInputForm({ onNewUser, onReturningUser }: PhoneInputFormProps) {
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await checkPhoneAction(normalized)

      if ('error' in result) {
        setError(result.error)
        return
      }

      if (result.isNewUser) {
        onNewUser(normalized)
      } else {
        // Returning user — send OTP immediately then advance
        const otpResult = await sendOTPAction(normalized)
        if ('error' in otpResult) {
          setError(otpResult.error)
          return
        }
        onReturningUser(normalized)
      }
    })
  }

  // Lightweight E.164 check — browser autocomplete sometimes strips the leading +
  // so we normalize all-digit values before validating.
  const normalized = normalizePhone(phone)
  const isValidPhone = /^\+\d{7,15}$/.test(normalized)

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label htmlFor="phone" className="text-sm font-medium text-gray-700">
        Phone Number
      </label>
      <input
        id="phone"
        type="tel"
        value={phone}
        onChange={(e) => {
          // Browser autocomplete can strip the leading + from E.164 numbers
          setPhone(normalizePhone(e.target.value))
        }}
        placeholder="+1 (555) 123-4567"
        autoComplete="tel"
        className="border border-gray-300 rounded-md px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-sage focus:border-transparent"
        disabled={isPending}
        required
      />
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={isPending || !isValidPhone}
        className="bg-terracotta text-white rounded-md py-2 px-4 font-medium hover:bg-terracotta/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Checking...' : 'Continue'}
      </button>
    </form>
  )
}
