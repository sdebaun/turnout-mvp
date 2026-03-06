'use client'

import { useState, useTransition } from 'react'
import { signInAction, sendOTPAction } from '../actions'
import { OTPBoxes } from './otp-boxes'

interface OTPInputFormProps {
  phone: string
  displayName?: string
  onSuccess: (result: { isNewUser: boolean }) => void
}

export function OTPInputForm({ phone, displayName, onSuccess }: OTPInputFormProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [resendPending, setResendPending] = useState(false)

  function handleSubmitWithCode(submittedCode: string) {
    setError(null)
    startTransition(async () => {
      const result = await signInAction(phone, submittedCode, displayName)
      if ('error' in result) { setError(result.error); return }
      onSuccess({ isNewUser: result.isNewUser })
    })
  }

  function handleChange(v: string) {
    setCode(v)
    // Auto-submit on WebOTP autofill (6 digits arrive at once)
    if (v.length === 6) handleSubmitWithCode(v)
  }

  async function handleResend() {
    setResendPending(true)
    setError(null)
    const result = await sendOTPAction(phone)
    if ('error' in result) setError(result.error)
    setResendPending(false)
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmitWithCode(code) }} className="flex flex-col gap-4">
      <p className="text-sm text-center text-muted">
        We sent a 6-digit code to {phone}
      </p>

      <OTPBoxes value={code} onChange={handleChange} disabled={isPending} />

      {error && <p className="text-sm text-red-600 text-center" role="alert">{error}</p>}

      <button
        type="submit"
        disabled={isPending || code.length < 6}
        className="bg-terracotta text-white rounded-md py-2 px-4 font-medium hover:bg-terracotta/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Verifying...' : 'Verify'}
      </button>

      <button
        type="button"
        onClick={handleResend}
        disabled={resendPending || isPending}
        className="text-sm text-sage hover:text-sage/80 disabled:text-sand disabled:cursor-not-allowed"
      >
        {resendPending ? 'Resending...' : "Didn't get a code? Resend"}
      </button>
    </form>
  )
}
