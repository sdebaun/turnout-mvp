'use client'

import { useState, useTransition, useCallback } from 'react'
import { uniqueNamesGenerator, adjectives, animals } from 'unique-names-generator'
import { sendOTPAction } from '../actions'

interface DisplayNameFormProps {
  phone: string
  onSuccess: (displayName: string) => void
}

function generateRandomName(): string {
  return uniqueNamesGenerator({
    dictionaries: [adjectives, animals],
    separator: '',
    style: 'capital',
  })
}

export function DisplayNameForm({ phone, onSuccess }: DisplayNameFormProps) {
  const [displayName, setDisplayName] = useState(() => generateRandomName())
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const reroll = useCallback(() => {
    setDisplayName(generateRandomName())
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const otpResult = await sendOTPAction(phone)
      if ('error' in otpResult) {
        setError(otpResult.error)
        return
      }
      onSuccess(displayName)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label htmlFor="displayName" className="text-sm font-medium text-gray-700">
        What should we call you?
      </label>
      <div className="flex gap-2">
        <input
          id="displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={50}
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isPending}
          required
        />
        <button
          type="button"
          onClick={reroll}
          disabled={isPending}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          title="Generate a new random name"
        >
          Reroll
        </button>
      </div>
      <p className="text-xs text-gray-500">
        You can use a random name for privacy, or enter your own.
      </p>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={isPending || !displayName.trim()}
        className="bg-blue-600 text-white rounded-md py-2 px-4 font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Sending code...' : 'Continue'}
      </button>
    </form>
  )
}
