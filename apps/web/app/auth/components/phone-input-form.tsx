'use client'

import { useState, useTransition } from 'react'
import { checkPhoneAction, sendOTPAction } from '../actions'

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
      const result = await checkPhoneAction(phone)

      if ('error' in result) {
        setError(result.error)
        return
      }

      if (result.isNewUser) {
        onNewUser(phone)
      } else {
        // Returning user — send OTP immediately then advance
        const otpResult = await sendOTPAction(phone)
        if ('error' in otpResult) {
          setError(otpResult.error)
          return
        }
        onReturningUser(phone)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label htmlFor="phone" className="text-sm font-medium text-gray-700">
        Phone Number
      </label>
      <input
        id="phone"
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="+1 (555) 123-4567"
        autoComplete="tel"
        className="border border-gray-300 rounded-md px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        disabled={isPending}
        className="bg-blue-600 text-white rounded-md py-2 px-4 font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Checking...' : 'Continue'}
      </button>
    </form>
  )
}
