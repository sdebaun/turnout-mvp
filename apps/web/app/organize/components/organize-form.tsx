'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { User } from '@prisma/client'
import { adjectives, animals, uniqueNamesGenerator } from 'unique-names-generator'
import { Calendar, Clock, MapPin, Phone } from 'lucide-react'
import { WizardLayout } from './wizard-layout'
import { TurnoutPreview } from './turnout-preview'
import { LocationInput } from './location-input'
import { createGroupWithTurnoutAction } from '../actions'
import { checkPhoneAction, sendOTPAction, signInAction } from '../../auth/actions'
import type { LocationData } from '../actions'

type WizardStep = 0 | 1 | 2 | 3 | 4

// Generates a fun random display name like "BlueWombat" or "SilverFox".
// Lives outside the component so it doesn't regenerate on every render.
function generateRandomName(): string {
  return uniqueNamesGenerator({
    dictionaries: [adjectives, animals],
    style: 'capital',
    separator: '',
  })
}

// Today's date as YYYY-MM-DD for min attribute on date input
function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

interface OrganizeFormProps {
  user: User | null
}

// ── Input field components per design spec ──────────────────────────────────
// Each: label above, then input container with optional icon + native input.
// Container: white fill, sage-tinted border, rounded-lg, y-padding py-2.5, x-padding px-3.

function IconInputWrapper({
  icon,
  children,
}: {
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2.5 border border-sage/30">
      {icon && (
        <span className="text-muted flex-shrink-0" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </div>
  )
}

function LabeledField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-muted font-sans">{label}</label>
      {children}
    </div>
  )
}

// ── Step 0: Expertise fork tiles ─────────────────────────────────────────────
// Two tiles: "Starting something new" (amber accent) and "Already organizing" (sage accent).
// Accent bar colors are fixed — not toggled by selection.
// Tapping a tile sets the active path; selection shown via ring outline.

type ExpertisePath = 'new' | 'existing'

function ExpertiseFork({
  selected,
  onSelect,
}: {
  selected: ExpertisePath
  onSelect: (path: ExpertisePath) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* Tile 1: "Starting something new" — amber accent bar (always) */}
      <button
        type="button"
        onClick={() => onSelect('new')}
        className={`flex text-left w-full bg-white border-0 p-0 cursor-pointer ${
          selected === 'new' ? 'ring-2 ring-amber' : 'ring-2 ring-transparent'
        }`}
      >
        {/* Fixed amber accent bar */}
        <div className="w-1.5 bg-amber self-stretch flex-shrink-0" />
        <div className="p-5 flex flex-col gap-3 flex-1">
          <div className="text-[22px] font-bold text-amber font-sans">
            Starting something new
          </div>
          <div className="text-[15px] font-normal text-tiletext font-sans">
            You have a cause or idea and want to bring people together around it.
          </div>
        </div>
      </button>

      {/* Tile 2: "Already organizing" — sage accent bar (always) */}
      <button
        type="button"
        onClick={() => onSelect('existing')}
        className={`flex text-left w-full bg-white border-0 p-0 cursor-pointer ${
          selected === 'existing' ? 'ring-2 ring-sage' : 'ring-2 ring-transparent'
        }`}
      >
        {/* Fixed sage accent bar */}
        <div className="w-1.5 bg-sage self-stretch flex-shrink-0" />
        <div className="p-5 flex flex-col gap-3 flex-1">
          <div className="text-[22px] font-bold text-charcoal font-sans">
            Already organizing
          </div>
          <div className="text-[15px] font-normal text-tiletext font-sans">
            You have an existing group you want to use turnout.network for.
          </div>
        </div>
      </button>
    </div>
  )
}

// ── Step 4: OTP boxes ────────────────────────────────────────────────────────
// Six individual digit boxes with a visual separator between box 3 and 4.
// WebOTP API handles auto-fill on supported mobile browsers.
// Focus/blur state managed via Tailwind focus variants — no inline style toggling.

function OTPBoxes({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  const inputs = useRef<Array<HTMLInputElement | null>>([])

  // WebOTP auto-fill — reads the SMS code and fills the input
  useEffect(() => {
    if (!('OTPCredential' in window)) return
    const ac = new AbortController()
    navigator.credentials
      .get({
        otp: { transport: ['sms'] },
        signal: ac.signal,
      } as CredentialRequestOptions)
      .then((otp: any) => {
        if (otp?.code) onChange(otp.code.slice(0, 6))
      })
      .catch(() => {
        // Expected on desktop / user dismissal — silent fallback to manual entry
      })
    return () => ac.abort()
    // Only run on mount — value/onChange refs won't change here
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
    if (digit && idx < 5) {
      inputs.current[idx + 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    onChange(pasted)
    const focusIdx = Math.min(pasted.length, 5)
    inputs.current[focusIdx]?.focus()
  }

  // Shared box class — focus:border-sage replaces the onFocus/onBlur inline style toggling
  const boxClass =
    'w-11 h-[52px] border border-skeleton rounded-lg text-center text-2xl font-mono text-charcoal bg-white outline-none focus:border-sage focus:outline-none'

  return (
    <div className="flex items-center justify-center gap-2">
      {[0, 1, 2].map((idx) => (
        <input
          key={idx}
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
      ))}

      {/* Visual separator dot between box 3 and 4 */}
      <div className="w-1.5 h-1.5 rounded-full bg-skeleton flex-shrink-0" aria-hidden="true" />

      {[3, 4, 5].map((idx) => (
        <input
          key={idx}
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
      ))}
    </div>
  )
}

// ── Main wizard component ────────────────────────────────────────────────────

export function OrganizeForm({ user }: OrganizeFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Step 1: when/where
  const [turnoutDate, setTurnoutDate] = useState('')
  const [turnoutTime, setTurnoutTime] = useState('')
  const [location, setLocation] = useState<LocationData | null>(null)

  // Step 2: naming
  const [groupName, setGroupName] = useState('')
  const [turnoutTitle, setTurnoutTitle] = useState('')

  // Step 3: identity
  const [displayName, setDisplayName] = useState(() => generateRandomName())
  const [phone, setPhone] = useState('')

  // Step 0: which path
  const [expertisePath, setExpertisePath] = useState<ExpertisePath>('new')

  // URL-based step routing — step is the source of truth, synced to ?step= param.
  // On page load: read from URL param if form data is present, else default to 0.
  // On refresh with step > 0: form data is empty, so redirect to step 0.
  const urlStep = parseInt(searchParams.get('step') ?? '0', 10) as WizardStep
  const validStep = [0, 1, 2, 3, 4].includes(urlStep) ? urlStep : 0

  // If URL says step > 0 but form hasn't been started (refresh scenario), force back to 0
  const [step, setStep] = useState<WizardStep>(() => {
    if (validStep > 0 && !turnoutDate && !groupName) return 0
    return validStep as WizardStep
  })

  // Sync step state → URL param. Use push so browser back button works.
  function goToStep(nextStep: WizardStep) {
    setStep(nextStep)
    const params = new URLSearchParams(searchParams.toString())
    params.set('step', String(nextStep))
    router.push(`/organize?${params.toString()}`)
  }

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Step 4: OTP
  const [otpCode, setOtpCode] = useState('')
  const [authPhone, setAuthPhone] = useState('')

  const handleLocationChange = useCallback((loc: LocationData) => {
    setLocation(loc)
  }, [])

  // ── Continue/submit handlers per step ──────────────────────────────────────

  function handleStep0Continue() {
    goToStep(1)
  }

  function handleStep1Continue() {
    goToStep(2)
  }

  function handleStep2Continue() {
    goToStep(3)
  }

  // Step 3 for already-authenticated users — skip OTP, create directly
  async function handleAuthenticatedCreate() {
    setIsSubmitting(true)
    setSubmitError(null)
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const result = await createGroupWithTurnoutAction({
      groupName,
      mission: groupName,
      turnoutTitle,
      location: location!,
      turnoutDate,
      turnoutTime,
      turnoutTimezone: timezone,
    })
    if ('error' in result) {
      setSubmitError(result.error)
      setIsSubmitting(false)
      return
    }
    router.push(`/t/${result.turnoutSlug}`)
  }

  // Step 3 → 4: send OTP code then advance
  async function handleSendCode() {
    setIsSubmitting(true)
    setSubmitError(null)

    const checkResult = await checkPhoneAction(phone)
    if ('error' in checkResult) {
      setSubmitError(checkResult.error)
      setIsSubmitting(false)
      return
    }

    const sendResult = await sendOTPAction(phone)
    if ('error' in sendResult) {
      setSubmitError(sendResult.error)
      setIsSubmitting(false)
      return
    }

    setAuthPhone(phone)
    setIsSubmitting(false)
    goToStep(4)
  }

  // Step 4: verify OTP + create group/turnout
  async function handleCreateTurnout() {
    setIsSubmitting(true)
    setSubmitError(null)

    const signInResult = await signInAction(authPhone, otpCode, displayName)
    if ('error' in signInResult) {
      setSubmitError(signInResult.error)
      setIsSubmitting(false)
      return
    }

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const result = await createGroupWithTurnoutAction({
      groupName,
      mission: groupName,
      turnoutTitle,
      location: location!,
      turnoutDate,
      turnoutTime,
      turnoutTimezone: timezone,
    })

    if ('error' in result) {
      setSubmitError(result.error)
      setIsSubmitting(false)
      return
    }

    router.push(`/t/${result.turnoutSlug}`)
  }

  // ── Per-step readiness checks ──────────────────────────────────────────────
  const step1Ready = Boolean(turnoutDate && turnoutTime && location)
  const step2Ready = Boolean(groupName.trim() && turnoutTitle.trim())
  const step3Ready = Boolean(displayName.trim() && phone.length >= 10)
  const step4Ready = otpCode.length === 6

  // Derive city shorthand from location's formattedAddress for TurnoutPreview
  const locationCity = location?.formattedAddress
    ? location.formattedAddress.split(',').slice(-2).join(',').trim()
    : undefined

  // The preview card always shows current form state, live.
  // All steps after 0 show the preview in the previewZone.
  const previewNode = step >= 1 ? (
    <TurnoutPreview
      date={turnoutDate || undefined}
      time={turnoutTime || undefined}
      locationName={location?.name}
      locationCity={locationCity}
      groupName={step >= 2 ? (groupName || undefined) : undefined}
      turnoutTitle={step >= 2 ? (turnoutTitle || undefined) : undefined}
      displayName={step >= 3 ? (user?.displayName ?? displayName) : undefined}
    />
  ) : undefined

  return (
    <>
      {/* ── Step 0: Expertise fork ── */}
      {step === 0 && (
        <WizardLayout
          headerTitle="Which of these is you?"
          headerSubtitle="Tell us where you're starting from."
          onBack={() => router.push('/')}
          onContinue={handleStep0Continue}
          continueLabel="Let's go"
          continueDisabled={false}
          isSubmitting={isSubmitting}
        >
          <ExpertiseFork selected={expertisePath} onSelect={setExpertisePath} />
        </WizardLayout>
      )}

      {/* ── Step 1: When and where ── */}
      {step === 1 && (
        <WizardLayout
          headerTitle="When and where?"
          headerSubtitle="Pick something — you can always adjust it later."
          currentStep={1}
          onBack={() => goToStep(0)}
          onContinue={handleStep1Continue}
          continueLabel="Continue"
          continueDisabled={!step1Ready}
          isSubmitting={isSubmitting}
          previewZone={previewNode}
        >
          <LabeledField label="Date">
            <IconInputWrapper icon={<Calendar size={16} strokeWidth={1.75} />}>
              <input
                type="date"
                value={turnoutDate}
                min={getTodayString()}
                onChange={(e) => setTurnoutDate(e.target.value)}
                // [color-scheme:light] prevents dark-mode browsers from inverting date picker chrome
                className="flex-1 min-w-0 border-none outline-none bg-transparent text-sm text-charcoal font-normal font-sans placeholder:text-sand [color-scheme:light]"
                data-testid="turnout-date"
              />
            </IconInputWrapper>
          </LabeledField>

          <LabeledField label="Time">
            <IconInputWrapper icon={<Clock size={16} strokeWidth={1.75} />}>
              <input
                type="time"
                value={turnoutTime}
                onChange={(e) => setTurnoutTime(e.target.value)}
                // [color-scheme:light] prevents dark-mode browsers from inverting time picker chrome
                className="flex-1 min-w-0 border-none outline-none bg-transparent text-sm text-charcoal font-normal font-sans placeholder:text-sand [color-scheme:light]"
                data-testid="turnout-time"
              />
            </IconInputWrapper>
          </LabeledField>

          {/* LocationInput is a Google Maps web component (shadow DOM) — must NOT be wrapped
              in IconInputWrapper. The component manages its own input styling entirely. */}
          <LabeledField label="Location">
            <LocationInput value={location} onChange={handleLocationChange} />
          </LabeledField>

          {submitError && <ErrorBanner message={submitError} />}
        </WizardLayout>
      )}

      {/* ── Step 2: Name it ── */}
      {step === 2 && (
        <WizardLayout
          headerTitle="What are you calling it?"
          headerSubtitle="Don't overthink it, you can always change it."
          currentStep={2}
          onBack={() => goToStep(1)}
          onContinue={handleStep2Continue}
          continueLabel="Continue"
          continueDisabled={!step2Ready}
          isSubmitting={isSubmitting}
          previewZone={previewNode}
        >
          <LabeledField label="Group name">
            <IconInputWrapper>
              <input
                type="text"
                value={groupName}
                maxLength={100}
                placeholder="Save Willow Creek"
                onChange={(e) => setGroupName(e.target.value)}
                className="flex-1 min-w-0 border-none outline-none bg-transparent text-sm text-charcoal font-normal font-sans placeholder:text-sand"
                data-testid="group-name"
              />
            </IconInputWrapper>
          </LabeledField>

          <LabeledField label="Turnout name">
            <IconInputWrapper>
              <input
                type="text"
                value={turnoutTitle}
                maxLength={100}
                placeholder="First Planning Meeting"
                onChange={(e) => setTurnoutTitle(e.target.value)}
                className="flex-1 min-w-0 border-none outline-none bg-transparent text-sm text-charcoal font-normal font-sans placeholder:text-sand"
                data-testid="turnout-title"
              />
            </IconInputWrapper>
          </LabeledField>

          {submitError && <ErrorBanner message={submitError} />}
        </WizardLayout>
      )}

      {/* ── Step 3: Claim it ── */}
      {step === 3 && (
        <WizardLayout
          headerTitle="Claim your turnout."
          headerSubtitle="One last step and it's yours."
          currentStep={3}
          onBack={() => goToStep(2)}
          onContinue={user ? handleAuthenticatedCreate : handleSendCode}
          continueLabel={user ? 'Create Turnout' : 'Send code'}
          continueDisabled={user ? false : !step3Ready}
          isSubmitting={isSubmitting}
          previewZone={previewNode}
        >
          {user ? (
            <div className="rounded-xl p-4 text-center bg-white border border-skeleton">
              <p className="text-sm font-medium text-sage">
                You&apos;re organizing as <strong>{user.displayName}</strong>
              </p>
              <p className="text-xs mt-1 text-muted">
                Hit &ldquo;Create Turnout&rdquo; to make it real.
              </p>
            </div>
          ) : (
            <>
              <LabeledField label="Your name">
                <div className="flex gap-2">
                  <IconInputWrapper>
                    <input
                      type="text"
                      value={displayName}
                      maxLength={50}
                      placeholder="Your display name"
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="flex-1 min-w-0 border-none outline-none bg-transparent text-sm text-charcoal font-normal font-sans placeholder:text-sand"
                      data-testid="display-name"
                    />
                  </IconInputWrapper>
                  {/* Reroll button — generate a new random name */}
                  <button
                    type="button"
                    title="Generate a random name"
                    onClick={() => setDisplayName(generateRandomName())}
                    className="flex-shrink-0 w-12 h-12 rounded-lg bg-offwhite border border-sage/30 flex items-center justify-center text-xl cursor-pointer"
                    aria-label="Generate random name"
                  >
                    🎲
                  </button>
                </div>
              </LabeledField>

              <LabeledField label="Phone number">
                <IconInputWrapper icon={<Phone size={16} strokeWidth={1.75} />}>
                  <input
                    type="tel"
                    value={phone}
                    placeholder="+1 (555) 000-0000"
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                    className="flex-1 min-w-0 border-none outline-none bg-transparent text-sm text-charcoal font-normal font-sans placeholder:text-sand"
                    data-testid="phone-number"
                  />
                </IconInputWrapper>
              </LabeledField>

              <p className="text-xs leading-relaxed text-muted text-center">
                We&apos;ll send a 6-digit code to confirm your number. Your number is only
                used for updates about your turnouts, and to let you sign in to manage them.
              </p>
            </>
          )}

          {submitError && <ErrorBanner message={submitError} />}
        </WizardLayout>
      )}

      {/* ── Step 4: OTP verification ── */}
      {step === 4 && (
        <WizardLayout
          headerTitle="Claim your turnout."
          headerSubtitle="Just confirm that it's you."
          currentStep={4}
          onBack={() => goToStep(3)}
          onContinue={handleCreateTurnout}
          continueLabel="Create Turnout"
          continueDisabled={!step4Ready}
          isSubmitting={isSubmitting}
          previewZone={previewNode}
        >
          <div className="flex flex-col gap-4">
            <p className="text-sm text-center text-muted">
              We just texted you a 6-digit code.
              <br />
              Enter the code we sent you.
            </p>

            <OTPBoxes
              value={otpCode}
              onChange={setOtpCode}
              disabled={isSubmitting}
            />
          </div>

          {submitError && <ErrorBanner message={submitError} />}
        </WizardLayout>
      )}
    </>
  )
}

// Inline error banner — shown at bottom of form zone on any step with an error
function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg p-3 bg-red-50 border border-red-200" role="alert">
      <p className="text-sm text-red-700">{message}</p>
    </div>
  )
}
