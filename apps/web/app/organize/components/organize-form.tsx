'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@prisma/client'
import { AuthModal } from '../../auth/components/auth-modal'
import { LocationInput } from './location-input'
import { createGroupWithTurnoutAction } from '../actions'
import type { LocationData } from '../actions'

interface OrganizeFormProps {
  user: User | null
}

interface FormErrors {
  mission?: string
  groupName?: string
  turnoutTitle?: string
  description?: string
  location?: string
  turnoutDate?: string
  turnoutTime?: string
}

// Today's date as YYYY-MM-DD for the min attribute on date input
function getTodayString(): string {
  const d = new Date()
  return d.toISOString().split('T')[0]
}

export function OrganizeForm({ user }: OrganizeFormProps) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)

  // Form field state
  const [mission, setMission] = useState('')
  const [groupName, setGroupName] = useState('')
  const [turnoutTitle, setTurnoutTitle] = useState('First Planning Meeting')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState<LocationData | null>(null)
  const [locationSelected, setLocationSelected] = useState(false)
  const [turnoutDate, setTurnoutDate] = useState('')
  const [turnoutTime, setTurnoutTime] = useState('')

  // UI state
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)

  // Stash validated form data so the auth callback can access it
  const pendingDataRef = useRef<Parameters<typeof createGroupWithTurnoutAction>[0] | null>(null)

  function validate(): FormErrors {
    const errs: FormErrors = {}

    if (!mission.trim()) errs.mission = 'Mission is required'
    else if (mission.length > 500) errs.mission = 'Mission must be 500 characters or less'

    if (!groupName.trim()) errs.groupName = 'Group name is required'
    else if (groupName.length > 100) errs.groupName = 'Group name must be 100 characters or less'

    if (!turnoutTitle.trim()) errs.turnoutTitle = 'Turnout title is required'
    else if (turnoutTitle.length > 100) errs.turnoutTitle = 'Turnout title must be 100 characters or less'

    if (description && description.length > 1000) errs.description = 'Description must be 1000 characters or less'

    if (!location || !locationSelected) {
      errs.location = location && !locationSelected
        ? 'Please select a location from the dropdown.'
        : 'Location is required'
    }

    if (!turnoutDate) errs.turnoutDate = 'Turnout date is required'
    else if (turnoutDate < getTodayString()) errs.turnoutDate = 'Turnout date must be in the future'

    if (!turnoutTime) errs.turnoutTime = 'Turnout time is required'

    return errs
  }

  // Focus the first field with an error so the user isn't hunting
  function focusFirstError(errs: FormErrors) {
    const fieldOrder: (keyof FormErrors)[] = [
      'mission', 'groupName', 'turnoutTitle', 'description',
      'location', 'turnoutDate', 'turnoutTime',
    ]
    for (const field of fieldOrder) {
      if (errs[field]) {
        const el = formRef.current?.querySelector(`[data-field="${field}"]`) as HTMLElement | null
        el?.focus()
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        break
      }
    }
  }

  const handleLocationChange = useCallback((loc: LocationData) => {
    setLocation(loc)
    setLocationSelected(true)
    // Clear location error when user selects a valid place
    setErrors(prev => ({ ...prev, location: undefined }))
  }, [])

  async function doCreate() {
    const data = pendingDataRef.current
    if (!data) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const result = await createGroupWithTurnoutAction(data)

      if ('error' in result) {
        setSubmitError(result.error)
        setIsSubmitting(false)
        return
      }

      router.push(`/t/${result.turnoutSlug}`)
    } catch {
      setSubmitError('Something went wrong. Please try again.')
      setIsSubmitting(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)

    const errs = validate()
    setErrors(errs)

    if (Object.keys(errs).length > 0) {
      focusFirstError(errs)
      return
    }

    // Capture timezone from browser
    const turnoutTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

    // Stash the validated data
    pendingDataRef.current = {
      groupName: groupName.trim(),
      mission: mission.trim(),
      turnoutTitle: turnoutTitle.trim(),
      description: description.trim() || undefined,
      location: location!,
      turnoutDate,
      turnoutTime,
      turnoutTimezone,
    }

    if (user) {
      // Already authenticated — create directly
      await doCreate()
    } else {
      // Need auth first — open the modal
      setShowAuthModal(true)
    }
  }

  // Called by AuthModal after successful auth
  const handleAuthSuccess = useCallback(async () => {
    setShowAuthModal(false)
    await doCreate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <form ref={formRef} onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-8" noValidate>
        {/* Section 1: Vision */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">What are you organizing for?</h2>

          <div>
            <label htmlFor="mission" className="block text-sm font-medium text-gray-700 mb-1">
              Your mission
            </label>
            <p className="text-xs text-gray-500 mb-1">Describe what you&apos;re fighting for or building toward.</p>
            <textarea
              id="mission"
              data-field="mission"
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              placeholder="Stop the gravel mine from destroying Willow Creek."
              maxLength={500}
              rows={3}
              className="border border-gray-300 rounded-md px-3 py-2 text-base w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            {errors.mission && (
              <p className="text-sm text-red-600 mt-1" role="alert">{errors.mission}</p>
            )}
          </div>

          <div>
            <label htmlFor="groupName" className="block text-sm font-medium text-gray-700 mb-1">
              Group name
            </label>
            <p className="text-xs text-gray-500 mb-1">Give your effort a name.</p>
            <input
              id="groupName"
              data-field="groupName"
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Save Willow Creek"
              maxLength={100}
              className="border border-gray-300 rounded-md px-3 py-2 text-base w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            {errors.groupName && (
              <p className="text-sm text-red-600 mt-1" role="alert">{errors.groupName}</p>
            )}
          </div>
        </section>

        {/* Section 2: Action */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Your first turnout</h2>

          <div>
            <label htmlFor="turnoutTitle" className="block text-sm font-medium text-gray-700 mb-1">
              Turnout title
            </label>
            <input
              id="turnoutTitle"
              data-field="turnoutTitle"
              type="text"
              value={turnoutTitle}
              onChange={(e) => setTurnoutTitle(e.target.value)}
              placeholder="First Planning Meeting"
              maxLength={100}
              className="border border-gray-300 rounded-md px-3 py-2 text-base w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            {errors.turnoutTitle && (
              <p className="text-sm text-red-600 mt-1" role="alert">{errors.turnoutTitle}</p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="description"
              data-field="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What should people expect? What will you decide or work on together?"
              maxLength={1000}
              rows={3}
              className="border border-gray-300 rounded-md px-3 py-2 text-base w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {errors.description && (
              <p className="text-sm text-red-600 mt-1" role="alert">{errors.description}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <div data-field="location">
              <LocationInput
                value={location}
                onChange={handleLocationChange}
                error={errors.location}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="turnoutDate" className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                id="turnoutDate"
                data-field="turnoutDate"
                type="date"
                value={turnoutDate}
                onChange={(e) => setTurnoutDate(e.target.value)}
                min={getTodayString()}
                className="border border-gray-300 rounded-md px-3 py-2 text-base w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              {errors.turnoutDate && (
                <p className="text-sm text-red-600 mt-1" role="alert">{errors.turnoutDate}</p>
              )}
            </div>

            <div>
              <label htmlFor="turnoutTime" className="block text-sm font-medium text-gray-700 mb-1">
                Time
              </label>
              <input
                id="turnoutTime"
                data-field="turnoutTime"
                type="time"
                value={turnoutTime}
                onChange={(e) => setTurnoutTime(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-base w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              {errors.turnoutTime && (
                <p className="text-sm text-red-600 mt-1" role="alert">{errors.turnoutTime}</p>
              )}
            </div>
          </div>
        </section>

        {/* Submit error banner */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-700" role="alert">{submitError}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white rounded-md py-3 px-4 font-medium text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Creating...' : 'Create Turnout'}
        </button>
      </form>

      {/* AuthModal — only opens for unauthenticated users after form validation passes */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false)
          setIsSubmitting(false)
        }}
        onSuccess={handleAuthSuccess}
        title="Before we make this official..."
        body="We need a way to reach you — your phone number is how we'll send reminders and keep you in the loop."
      />
    </>
  )
}
