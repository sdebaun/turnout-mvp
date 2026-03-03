'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@prisma/client'
import { adjectives, animals, uniqueNamesGenerator } from 'unique-names-generator'
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

// Styled form field — label above, input below, consistent look throughout wizard
function FormField({
  label,
  children,
  hint,
}: {
  label: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold" style={{ color: '#1E2420' }}>
        {label}
      </label>
      {hint && <p className="text-xs" style={{ color: '#6B7280' }}>{hint}</p>}
      {children}
    </div>
  )
}

// Consistent styled text input for the wizard
const inputStyle: React.CSSProperties = {
  border: '1.5px solid #DDD8D0',
  borderRadius: '8px',
  padding: '12px',
  width: '100%',
  fontSize: '1rem',
  outline: 'none',
  backgroundColor: 'white',
  color: '#1E2420',
  fontFamily: 'inherit',
}

function StyledInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={inputStyle}
      onFocus={(e) => {
        e.target.style.borderColor = '#3D6B52'
        props.onFocus?.(e)
      }}
      onBlur={(e) => {
        e.target.style.borderColor = '#DDD8D0'
        props.onBlur?.(e)
      }}
    />
  )
}

// ─── Step 0: Expertise Fork ────────────────────────────────────────────────

type ExpertisePath = 'new' | 'existing'

function ExpertiseFork({
  selected,
  onSelect,
}: {
  selected: ExpertisePath
  onSelect: (path: ExpertisePath) => void
}) {
  return (
    <div className="space-y-3">
      {/* "Starting something new" — selected by default, amber accent */}
      <button
        type="button"
        onClick={() => onSelect('new')}
        className="w-full text-left rounded-xl p-4 border-l-4 transition-all"
        style={{
          backgroundColor: 'white',
          borderLeftColor: selected === 'new' ? '#C8831A' : '#DDD8D0',
          border: '1px solid #DDD8D0',
          borderLeft: `4px solid ${selected === 'new' ? '#C8831A' : '#DDD8D0'}`,
          boxShadow: selected === 'new' ? '0 1px 8px rgba(200,131,26,0.12)' : 'none',
        }}
      >
        <div
          className="font-semibold text-base mb-1"
          style={{ color: selected === 'new' ? '#C8831A' : '#1E2420' }}
        >
          Starting something new
        </div>
        <div className="text-sm" style={{ color: '#6B7280' }}>
          You have a cause or idea and want to bring people together around it.
        </div>
      </button>

      {/* "Already organizing" — neutral accent when not selected */}
      <button
        type="button"
        onClick={() => onSelect('existing')}
        className="w-full text-left rounded-xl p-4 transition-all"
        style={{
          backgroundColor: 'white',
          border: '1px solid #DDD8D0',
          borderLeft: `4px solid ${selected === 'existing' ? '#1E2420' : '#DDD8D0'}`,
          boxShadow: selected === 'existing' ? '0 1px 8px rgba(30,36,32,0.08)' : 'none',
        }}
      >
        <div
          className="font-semibold text-base mb-1"
          style={{ color: '#1E2420' }}
        >
          Already organizing
        </div>
        <div className="text-sm" style={{ color: '#6B7280' }}>
          You have an existing group you want to use turnout.network for.
        </div>
      </button>
    </div>
  )
}

// ─── Step 3: OTP boxes ────────────────────────────────────────────────────

// Six individual digit boxes with a visual separator between box 3 and 4.
// WebOTP API handles auto-fill on supported mobile browsers.
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
      // Move focus left on backspace when box is empty
      inputs.current[idx - 1]?.focus()
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>, idx: number) {
    const digit = e.target.value.replace(/\D/g, '').slice(-1)
    const chars = value.split('')
    chars[idx] = digit
    // Fill any gaps with empty string
    onChange(chars.slice(0, 6).join(''))
    if (digit && idx < 5) {
      inputs.current[idx + 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    onChange(pasted)
    // Focus the last filled box or the next empty one
    const focusIdx = Math.min(pasted.length, 5)
    inputs.current[focusIdx]?.focus()
  }

  const boxStyle: React.CSSProperties = {
    width: '44px',
    height: '52px',
    border: '1.5px solid #DDD8D0',
    borderRadius: '8px',
    textAlign: 'center',
    fontSize: '1.5rem',
    fontFamily: 'monospace',
    color: '#1E2420',
    backgroundColor: 'white',
    outline: 'none',
  }

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
          onFocus={(e) => { e.target.style.borderColor = '#3D6B52' }}
          onBlur={(e) => { e.target.style.borderColor = '#DDD8D0' }}
          disabled={disabled}
          style={boxStyle}
          aria-label={`Digit ${idx + 1}`}
        />
      ))}

      {/* Visual separator dot between box 3 and 4 */}
      <div
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: '#DDD8D0' }}
        aria-hidden="true"
      />

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
          onFocus={(e) => { e.target.style.borderColor = '#3D6B52' }}
          onBlur={(e) => { e.target.style.borderColor = '#DDD8D0' }}
          disabled={disabled}
          style={boxStyle}
          aria-label={`Digit ${idx + 1}`}
        />
      ))}
    </div>
  )
}

// ─── Main wizard component ────────────────────────────────────────────────

export function OrganizeForm({ user }: OrganizeFormProps) {
  const router = useRouter()

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

  // Wizard navigation
  const [step, setStep] = useState<WizardStep>(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Step 4: OTP
  const [otpCode, setOtpCode] = useState('')
  // Normalized phone stored after step 3 validates and sends code
  const [authPhone, setAuthPhone] = useState('')

  const handleLocationChange = useCallback((loc: LocationData) => {
    setLocation(loc)
  }, [])

  // ── Continue/submit handlers per step ──

  // Step 0 → 1 (trivially enabled since one option always selected)
  function handleStep0Continue() {
    setStep(1)
  }

  // Step 1 → 2 (enabled when date+time+location all filled)
  function handleStep1Continue() {
    setStep(2)
  }

  // Step 2 → 3 (enabled when groupName+turnoutTitle both filled)
  function handleStep2Continue() {
    setStep(3)
  }

  // Step 3 for authenticated users — skip OTP, create directly
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

  // Step 3 → 4 (send OTP code)
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

    // Store normalized phone for step 4 — the action returns success, not the normalized number,
    // so we keep what the user typed and let signInAction normalize it again.
    setAuthPhone(phone)
    setIsSubmitting(false)
    setStep(4)
  }

  // Step 4: verify OTP + create group/turnout
  async function handleCreateTurnout() {
    setIsSubmitting(true)
    setSubmitError(null)

    // Verify OTP and establish session
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

  // ── Per-step continue logic ──

  const step1Ready = Boolean(turnoutDate && turnoutTime && location)
  const step2Ready = Boolean(groupName.trim() && turnoutTitle.trim())
  const step3Ready = Boolean(displayName.trim() && phone.length >= 10)
  const step4Ready = otpCode.length === 6

  // Derive city from location's formattedAddress for TurnoutPreview display
  const locationCity = location?.formattedAddress
    ? location.formattedAddress.split(',').slice(-2).join(',').trim()
    : undefined

  // ── Step config ──

  type StepConfig = {
    headerTitle: string
    headerSubtitle: string
    currentStep?: number
    continueLabel: string
    continueDisabled: boolean
    onBack?: () => void
    onContinue: () => void
  }

  const stepConfigs: Record<WizardStep, StepConfig> = {
    0: {
      headerTitle: 'Which of these is you?',
      headerSubtitle: "Tell us where you're starting from.",
      continueLabel: "Let's go \u203a",
      continueDisabled: false,
      onContinue: handleStep0Continue,
    },
    1: {
      headerTitle: 'When and where?',
      headerSubtitle: 'Pick something — you can always adjust it later.',
      currentStep: 1,
      continueLabel: 'Continue \u203a',
      continueDisabled: !step1Ready,
      onBack: () => setStep(0),
      onContinue: handleStep1Continue,
    },
    2: {
      headerTitle: 'What are you calling it?',
      headerSubtitle: "Don't overthink it, you can always change it.",
      currentStep: 2,
      continueLabel: 'Continue \u203a',
      continueDisabled: !step2Ready,
      onBack: () => setStep(1),
      onContinue: handleStep2Continue,
    },
    3: {
      headerTitle: 'Claim your turnout.',
      headerSubtitle: 'One last step and it\u2019s yours.',
      currentStep: 3,
      continueLabel: user ? 'Create Turnout \u203a' : 'Send code \u203a',
      continueDisabled: user ? false : !step3Ready,
      onBack: () => setStep(2),
      onContinue: user ? handleAuthenticatedCreate : handleSendCode,
    },
    4: {
      headerTitle: 'Claim your turnout.',
      headerSubtitle: 'Just confirm that it\u2019s you.',
      currentStep: 4,
      continueLabel: 'Create Turnout \u203a',
      continueDisabled: !step4Ready,
      onBack: () => setStep(3),
      onContinue: handleCreateTurnout,
    },
  }

  const config = stepConfigs[step]

  // The preview card uses filled data for steps 3+, partial for step 2, ghost for step 1
  const previewGroupName = step >= 2 ? groupName || undefined : undefined
  const previewTitle = step >= 2 ? turnoutTitle || undefined : undefined
  const previewOrganizer = step >= 3 ? (user?.displayName ?? displayName) : undefined

  return (
    <WizardLayout
      headerTitle={config.headerTitle}
      headerSubtitle={config.headerSubtitle}
      currentStep={config.currentStep}
      onBack={config.onBack}
      onContinue={config.onContinue}
      continueLabel={config.continueLabel}
      continueDisabled={config.continueDisabled}
      isSubmitting={isSubmitting}
    >
      {/* ── Step 0: Expertise fork ── */}
      {step === 0 && (
        <ExpertiseFork selected={expertisePath} onSelect={setExpertisePath} />
      )}

      {/* ── Step 1: When and where ── */}
      {step === 1 && (
        <>
          <TurnoutPreview
            date={turnoutDate || undefined}
            time={turnoutTime || undefined}
            locationName={location?.name}
            locationCity={locationCity}
          />

          <FormField label="Date">
            <StyledInput
              type="date"
              value={turnoutDate}
              min={getTodayString()}
              onChange={(e) => setTurnoutDate(e.target.value)}
              data-testid="turnout-date"
            />
          </FormField>

          <FormField label="Time">
            <StyledInput
              type="time"
              value={turnoutTime}
              onChange={(e) => setTurnoutTime(e.target.value)}
              data-testid="turnout-time"
            />
          </FormField>

          <FormField label="Location">
            <LocationInput
              value={location}
              onChange={handleLocationChange}
            />
          </FormField>
        </>
      )}

      {/* ── Step 2: Name it ── */}
      {step === 2 && (
        <>
          <TurnoutPreview
            date={turnoutDate}
            time={turnoutTime}
            locationName={location?.name}
            locationCity={locationCity}
            groupName={previewGroupName}
            turnoutTitle={previewTitle}
          />

          <FormField
            label="Group name"
            hint="What are you calling your organizing effort?"
          >
            <StyledInput
              type="text"
              value={groupName}
              maxLength={100}
              placeholder="Save Willow Creek"
              onChange={(e) => setGroupName(e.target.value)}
              data-testid="group-name"
            />
          </FormField>

          <FormField
            label="Turnout name"
            hint="What's this specific event called?"
          >
            <StyledInput
              type="text"
              value={turnoutTitle}
              maxLength={100}
              placeholder="First Planning Meeting"
              onChange={(e) => setTurnoutTitle(e.target.value)}
              data-testid="turnout-title"
            />
          </FormField>
        </>
      )}

      {/* ── Step 3: Claim it ── */}
      {step === 3 && (
        <>
          <TurnoutPreview
            date={turnoutDate}
            time={turnoutTime}
            locationName={location?.name}
            locationCity={locationCity}
            groupName={groupName}
            turnoutTitle={turnoutTitle}
            displayName={user?.displayName ?? displayName}
          />

          {user ? (
            // Already authenticated — skip phone/OTP, just confirm and create
            <div
              className="rounded-xl p-4 text-center"
              style={{ backgroundColor: 'white', border: '1px solid #DDD8D0' }}
            >
              <p className="text-sm font-medium" style={{ color: '#3D6B52' }}>
                You&apos;re organizing as <strong>{user.displayName}</strong>
              </p>
              <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                Hit &ldquo;Create Turnout&rdquo; to make it real.
              </p>
            </div>
          ) : (
            <>
              <FormField label="Your name">
                <div className="flex gap-2">
                  <StyledInput
                    type="text"
                    value={displayName}
                    maxLength={50}
                    placeholder="Your display name"
                    onChange={(e) => setDisplayName(e.target.value)}
                    data-testid="display-name"
                  />
                  {/* Reroll button — generate a new random name */}
                  <button
                    type="button"
                    title="Generate a random name"
                    onClick={() => setDisplayName(generateRandomName())}
                    className="flex-shrink-0 w-12 rounded-lg flex items-center justify-center text-lg"
                    style={{
                      border: '1.5px solid #DDD8D0',
                      backgroundColor: 'white',
                    }}
                    aria-label="Generate random name"
                  >
                    🎲
                  </button>
                </div>
              </FormField>

              <FormField label="Phone number">
                <StyledInput
                  type="tel"
                  value={phone}
                  placeholder="+1 (555) 000-0000"
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  data-testid="phone-number"
                />
              </FormField>

              <p className="text-xs leading-relaxed" style={{ color: '#6B7280' }}>
                We&apos;ll send a 6-digit code to confirm your number. Your number is only
                used for updates about your turnouts, and to let you sign in to manage them.
              </p>
            </>
          )}
        </>
      )}

      {/* ── Step 4: OTP verification ── */}
      {step === 4 && (
        <>
          <TurnoutPreview
            date={turnoutDate}
            time={turnoutTime}
            locationName={location?.name}
            locationCity={locationCity}
            groupName={groupName}
            turnoutTitle={turnoutTitle}
            displayName={displayName}
          />

          <div className="space-y-4">
            <p className="text-sm text-center" style={{ color: '#6B7280' }}>
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
        </>
      )}

      {/* Error display — shown at the bottom of the body on any step */}
      {submitError && (
        <div
          className="rounded-lg p-3"
          style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}
          role="alert"
        >
          <p className="text-sm" style={{ color: '#B91C1C' }}>{submitError}</p>
        </div>
      )}
    </WizardLayout>
  )
}
