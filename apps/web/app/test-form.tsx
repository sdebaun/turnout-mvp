'use client'

import { useFormStatus } from 'react-dom'
import { incrementCounter } from './actions'
import { useState } from 'react'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
    >
      {pending ? 'Running...' : 'Test Server Action'}
    </button>
  )
}

export function TestForm() {
  const [lastRun, setLastRun] = useState<string | null>(null)

  async function handleAction() {
    await incrementCounter()
    setLastRun(new Date().toLocaleTimeString())
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <form action={handleAction}>
        <SubmitButton />
      </form>

      {lastRun && (
        <p className="text-green-600 font-semibold">
          ✓ Server Action executed at {lastRun}
        </p>
      )}
    </div>
  )
}
