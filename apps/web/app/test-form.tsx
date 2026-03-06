'use client'

import { incrementCounter } from './actions'
import { useState } from 'react'

export function TestForm() {
  const [lastRun, setLastRun] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setIsPending(true)
    setError(null)
    try {
      await incrementCounter()
      setLastRun(new Date().toLocaleTimeString())
    } catch (e) {
      setError(String(e))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
      >
        {isPending ? 'Running...' : 'Test Server Action'}
      </button>

      {lastRun && (
        <p className="text-green-600 font-semibold">
          ✓ Server Action executed at {lastRun}
        </p>
      )}

      {error && (
        <p className="text-red-600 font-semibold">
          Server action error: {error}
        </p>
      )}
    </div>
  )
}
