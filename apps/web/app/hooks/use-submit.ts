'use client'

import { useState } from 'react'

export function useSubmit() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  async function withSubmit(fn: () => Promise<void>) {
    setIsSubmitting(true)
    setSubmitError(null)
    try { await fn() } finally { setIsSubmitting(false) }
  }

  return { isSubmitting, submitError, setSubmitError, withSubmit }
}
