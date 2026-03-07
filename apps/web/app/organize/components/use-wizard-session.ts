'use client'

import { useState, useEffect } from 'react'
import { z } from 'zod'
import { LocationDataSchema } from '../schemas'

const SESSION_KEY = 'organize-wizard-v1'

const WizardStateSchema = z.object({
  turnoutDate: z.string().default(''),
  turnoutTime: z.string().default(''),
  location: LocationDataSchema.nullable().default(null),
  groupName: z.string().default(''),
  turnoutTitle: z.string().default(''),
  displayName: z.string().default(''),
  phone: z.string().default(''),
  expertisePath: z.enum(['new', 'existing']).default('new'),
})

export type WizardState = z.infer<typeof WizardStateSchema>

// Module-level reference — reference equality in the persist effect depends on this
const EMPTY_STATE: WizardState = WizardStateSchema.parse({})

function readSession(): unknown {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? '{}') } catch { return {} }
}

export function useWizardSession() {
  const [state, setState] = useState<WizardState>(EMPTY_STATE)

  // Restore saved session on mount
  useEffect(() => {
    const result = WizardStateSchema.safeParse(readSession())
    if (result.success) setState(result.data)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Persist on every change, but skip the initial empty render to avoid wiping
  // a previously saved session before the restore effect above has had a chance to run
  useEffect(() => {
    if (state === EMPTY_STATE) return
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(state)) } catch {}
  }, [state])

  const update = (patch: Partial<WizardState>) => setState(s => ({ ...s, ...patch }))

  function clearSession() {
    try { sessionStorage.removeItem(SESSION_KEY) } catch {}
  }

  return { state, update, clearSession }
}
