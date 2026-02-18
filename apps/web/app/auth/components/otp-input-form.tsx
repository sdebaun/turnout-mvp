'use client'

import { useState, useEffect, useTransition } from 'react'
import { signInAction, sendOTPAction } from '../actions'

interface OTPInputFormProps {
  phone: string
  displayName?: string
  onSuccess: () => void
}

export function OTPInputForm({ phone, displayName, onSuccess }: OTPInputFormProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [resendPending, setResendPending] = useState(false)

  // WebOTP API — auto-read SMS code on supported mobile browsers
  useEffect(() => {
    if (!('OTPCredential' in window)) return

    const ac = new AbortController()
    navigator.credentials
      .get({
        otp: { transport: ['sms'] },
        signal: ac.signal,
      } as CredentialRequestOptions)
      .then((otp: any) => {
        if (otp?.code) {
          setCode(otp.code)
          // Auto-submit after autofill
          handleSubmitWithCode(otp.code)
        }
      })
      .catch(() => {
        // Expected on desktop or when user dismisses — fall back to manual entry
      })

    return () => ac.abort()
    // Only run on mount — phone/displayName won't change during OTP step
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSubmitWithCode(submittedCode: string) {
    setError(null)
    startTransition(async () => {
      const result = await signInAction(phone, submittedCode, displayName)
      if ('error' in result) {
        setError(result.error)
        return
      }
      onSuccess()
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    handleSubmitWithCode(code)
  }

  async function handleResend() {
    setResendPending(true)
    setError(null)
    const result = await sendOTPAction(phone)
    if ('error' in result) {
      setError(result.error)
    }
    setResendPending(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label htmlFor="otp-code" className="text-sm font-medium text-gray-700">
        Enter the 6-digit code sent to {phone}
      </label>
      <input
        id="otp-code"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="000000"
        maxLength={6}
        className="border border-gray-300 rounded-md px-3 py-2 text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        disabled={isPending || code.length < 4}
        className="bg-blue-600 text-white rounded-md py-2 px-4 font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Verifying...' : 'Verify'}
      </button>
      <button
        type="button"
        onClick={handleResend}
        disabled={resendPending || isPending}
        className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
      >
        {resendPending ? 'Resending...' : "Didn't get a code? Resend"}
      </button>
    </form>
  )
}
