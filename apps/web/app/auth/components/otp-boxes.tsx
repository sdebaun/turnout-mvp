'use client'

import React, { useRef, useEffect } from 'react'

// Six individual digit boxes with a visual separator between box 3 and 4.
// WebOTP API handles auto-fill on supported mobile browsers.
export function OTPBoxes({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  const inputs = useRef<Array<HTMLInputElement | null>>([])

  // WebOTP auto-fill — reads the SMS code and fills all boxes at once
  useEffect(() => {
    if (!('OTPCredential' in window)) return
    const ac = new AbortController()
    navigator.credentials
      .get({
        otp: { transport: ['sms'] },
        signal: ac.signal,
      } as CredentialRequestOptions)
      .then((credential) => {
        // OTPCredential is not in the TypeScript DOM lib — WICG spec, not yet standardized
        // https://wicg.github.io/web-otp/
        const otp = credential as { code?: string }
        if (otp?.code) onChange(otp.code.slice(0, 6))
      })
      .catch(() => {
        // Expected on desktop / user dismissal — silent fallback to manual entry
      })
    return () => ac.abort()
    // Only run on mount — onChange ref won't change here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, idx: number) {
    if (e.key === 'Backspace' && !value[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus()
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>, idx: number) {
    const digit = e.target.value.replace(/\D/g, '').slice(-1)
    const chars = value.split('')
    chars[idx] = digit
    onChange(chars.slice(0, 6).join(''))
    if (digit && idx < 5) inputs.current[idx + 1]?.focus()
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    onChange(pasted)
    inputs.current[Math.min(pasted.length, 5)]?.focus()
  }

  const boxClass =
    'w-11 h-[52px] border border-skeleton rounded-lg text-center text-2xl font-mono text-charcoal bg-white outline-none focus:border-sage focus:outline-none'

  return (
    <div className="flex items-center justify-center gap-2">
      {[0, 1, 2, 3, 4, 5].map((idx) => (
        <React.Fragment key={idx}>
          {idx === 3 && <div className="w-1.5 h-1.5 rounded-full bg-skeleton flex-shrink-0" aria-hidden="true" />}
          <input
            ref={(el) => { inputs.current[idx] = el }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            value={value[idx] ?? ''}
            onChange={(e) => handleChange(e, idx)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            onPaste={handlePaste}
            disabled={disabled}
            className={boxClass}
            aria-label={`Digit ${idx + 1}`}
          />
        </React.Fragment>
      ))}
    </div>
  )
}
