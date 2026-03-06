'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { User } from '@prisma/client'
import { Calendar, Clock, Phone } from 'lucide-react'
import { WizardLayout } from './wizard-layout'
import { TurnoutPreview } from './turnout-preview'
import { LocationInput } from './location-input'
import { OptionGroup, type OptionItem } from '../../components/option-group'
import { OTPInputForm } from '../../auth/components/otp-input-form'
import { createGroupWithTurnoutAction } from '../actions'
import { checkPhoneAction, sendOTPAction } from '../../auth/actions'
import type { LocationData } from '../actions'
import { normalizePhone } from '@/lib/phone'
import { generateRandomName } from '@/lib/names'

type WizardStep = 0 | 1 | 2 | 3 | 4

// Shared input element styles — all wizard text inputs use this base
const INPUT_CLASSES = 'flex-1 min-w-0 border-none outline-none bg-transparent text-sm text-charcoal font-normal font-sans placeholder:text-sand'

function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

// ── Session persistence ───────────────────────────────────────────────────────
// Wizard state is stored in sessionStorage so a page refresh preserves progress.
// Key is versioned so schema changes don't deserialize stale shape.
const SESSION_KEY = 'organize-wizard-v1'

function readSession(): Record<string, unknown> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeSession(data: Record<string, unknown>) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data))
  } catch {}
}

function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {}
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
  className,
}: {
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`flex items-center gap-2 rounded-lg bg-white px-3 py-2.5 border border-sage/30 ${className ?? ''}`}>
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

// ── Step 0: Expertise fork ───────────────────────────────────────────────────

type ExpertisePath = 'new' | 'existing'

const EXPERTISE_OPTIONS: OptionItem[] = [
  {
    value: 'new',
    label: 'Starting something new',
    description: 'You have a cause or idea and want to bring people together around it.',
  },
  {
    value: 'existing',
    label: 'Already organizing',
    description: 'You have an existing group you want to use turnout.network for.',
  },
]

// ── Main wizard component ────────────────────────────────────────────────────

export function OrganizeForm({ user }: OrganizeFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Step is driven PURELY from URL param — no useState.
  // This lets you navigate directly to any step via ?step=N for dev/debugging,
  // and means browser back/forward just works — no step state to sync.
  const urlStep = parseInt(searchParams.get('step') ?? '0', 10)
  const step = ([0, 1, 2, 3, 4].includes(urlStep) ? urlStep : 0) as WizardStep

  function goToStep(nextStep: WizardStep) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('step', String(nextStep))
    router.push(`/organize?${params.toString()}`)
  }

  // All form state initialized from empty — sessionStorage restores on mount.
  // This pattern avoids SSR/client hydration mismatches.
  const [turnoutDate, setTurnoutDate] = useState('')
  const [turnoutTime, setTurnoutTime] = useState('')
  const [location, setLocation] = useState<LocationData | null>(null)
  const [groupName, setGroupName] = useState('')
  const [turnoutTitle, setTurnoutTitle] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [expertisePath, setExpertisePath] = useState<ExpertisePath>('new')

  // On mount: restore from sessionStorage if available
  useEffect(() => {
    const s = readSession()
    if (typeof s.turnoutDate === 'string' && s.turnoutDate) setTurnoutDate(s.turnoutDate)
    if (typeof s.turnoutTime === 'string' && s.turnoutTime) setTurnoutTime(s.turnoutTime)
    if (s.location && typeof (s.location as Record<string, unknown>).name === 'string') {
      setLocation(s.location as LocationData)
    }
    if (typeof s.groupName === 'string' && s.groupName) setGroupName(s.groupName)
    if (typeof s.turnoutTitle === 'string' && s.turnoutTitle) setTurnoutTitle(s.turnoutTitle)
    // displayName: restore only if previously saved — no auto-generation on fresh session
    if (typeof s.displayName === 'string' && s.displayName) setDisplayName(s.displayName)
    if (typeof s.phone === 'string' && s.phone) setPhone(s.phone)
    if (s.expertisePath === 'existing') setExpertisePath('existing')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Persist all form state to sessionStorage on every change
  useEffect(() => {
    writeSession({ turnoutDate, turnoutTime, location, groupName, turnoutTitle, displayName, phone, expertisePath })
  }, [turnoutDate, turnoutTime, location, groupName, turnoutTitle, displayName, phone, expertisePath])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [authPhone, setAuthPhone] = useState('')

  // ── Continue/submit handlers per step ──────────────────────────────────────

  // Shared — called after auth is confirmed (either authenticated already, or OTP verified)
  async function doCreate() {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const result = await createGroupWithTurnoutAction({
        groupName, mission: groupName, turnoutTitle,
        location: location!, turnoutDate, turnoutTime, turnoutTimezone: timezone,
      })
      if ('error' in result) { setSubmitError(result.error); return }
      clearSession()
      router.push(`/t/${result.turnoutSlug}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Step 3 → 4: send OTP code then advance
  async function handleSendCode() {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const checkResult = await checkPhoneAction(phone)
      if ('error' in checkResult) { setSubmitError(checkResult.error); return }

      const sendResult = await sendOTPAction(phone)
      if ('error' in sendResult) { setSubmitError(sendResult.error); return }

      setAuthPhone(phone)
      goToStep(4)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Per-step readiness checks ──────────────────────────────────────────────
  const step1Ready = Boolean(turnoutDate && turnoutTime && location)
  const step2Ready = Boolean(groupName.trim() && turnoutTitle.trim())
  const step3Ready = Boolean(displayName.trim() && phone.length >= 10)
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
      groupName={groupName || undefined}
      turnoutTitle={turnoutTitle || undefined}
      displayName={user?.displayName ?? (displayName || undefined)}
    />
  ) : undefined

  return (
    <>
      {/* ── Step 0: Expertise fork ── */}
      {step === 0 && (
        <WizardLayout
          headerTitle="Which of these is you?"
          headerSubtitle="Tell us where you're starting from."
          onBack={() => { clearSession(); router.push('/') }}
          onContinue={() => goToStep(1)}
          continueLabel="Let's go"
          isSubmitting={isSubmitting}
        >
          <OptionGroup
            options={EXPERTISE_OPTIONS}
            value={expertisePath}
            onChange={(v) => setExpertisePath(v as ExpertisePath)}
          />
        </WizardLayout>
      )}

      {/* ── Step 1: When and where ── */}
      {step === 1 && (
        <WizardLayout
          headerTitle="When and where?"
          headerSubtitle="Pick something — you can always adjust it later."
          currentStep={1}
          onBack={() => goToStep(0)}
          onContinue={() => goToStep(2)}
          continueLabel="Continue"
          continueDisabled={!step1Ready}
          isSubmitting={isSubmitting}
          previewZone={previewNode}
        >
          {/* Design shows "Choose a date" / "Choose a time" as placeholder text.
              Native date/time inputs ignore placeholder — the browser renders its own
              format hint ("mm/dd/yyyy", "--:--") instead. Overriding this requires a
              fully custom date picker, which is out of scope. */}
          <LabeledField label="Date">
            <IconInputWrapper icon={<Calendar size={16} strokeWidth={1.75} />}>
              <input
                type="date"
                value={turnoutDate}
                min={getTodayString()}
                onChange={(e) => setTurnoutDate(e.target.value)}
                // showPicker() makes the entire input area clickable — not just the (hidden) indicator
                onClick={(e) => { try { (e.currentTarget as any).showPicker() } catch {} }}
                // [color-scheme:light] prevents dark-mode browsers from inverting date picker chrome
                className={`${INPUT_CLASSES} [color-scheme:light]`}
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
                onClick={(e) => { try { (e.currentTarget as any).showPicker() } catch {} }}
                // [color-scheme:light] prevents dark-mode browsers from inverting time picker chrome
                className={`${INPUT_CLASSES} [color-scheme:light]`}
                data-testid="turnout-time"
              />
            </IconInputWrapper>
          </LabeledField>

          {/* LocationInput is a Google Maps web component (shadow DOM) — must NOT be wrapped
              in IconInputWrapper. The component manages its own input styling entirely. */}
          <LabeledField label="Location">
            <LocationInput value={location} onChange={setLocation} />
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
          onContinue={() => goToStep(3)}
          continueLabel="Continue"
          continueDisabled={!step2Ready}
          isSubmitting={isSubmitting}
          previewZone={previewNode}
        >
          <LabeledField label="Group">
            <IconInputWrapper>
              <input
                type="text"
                value={groupName}
                maxLength={100}
                placeholder="Save Willow Creek, Local Love Project..."
                onChange={(e) => setGroupName(e.target.value)}
                className={INPUT_CLASSES}
                data-testid="group-name"
              />
            </IconInputWrapper>
          </LabeledField>

          <LabeledField label="Turnout">
            <IconInputWrapper>
              <input
                type="text"
                value={turnoutTitle}
                maxLength={100}
                placeholder="Planning Meeting, Kickoff, March..."
                onChange={(e) => setTurnoutTitle(e.target.value)}
                className={INPUT_CLASSES}
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
          onContinue={user ? doCreate : handleSendCode}
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
                {/* flex-1 on wrapper so it fills available width; button is fixed 48px */}
                <div className="flex gap-2">
                  <IconInputWrapper className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={displayName}
                      maxLength={50}
                      placeholder="Real name, nickname, or roll one"
                      onChange={(e) => setDisplayName(e.target.value)}
                      className={INPUT_CLASSES}
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
                    onChange={(e) => {
                      // Browser autocomplete sometimes strips the leading + from E.164 numbers.
                      setPhone(normalizePhone(e.target.value))
                    }}
                    autoComplete="tel"
                    className={INPUT_CLASSES}
                    data-testid="phone-number"
                  />
                </IconInputWrapper>
              </LabeledField>

              {/* Trust block — two text nodes per Pencil spec: large semibold + small muted */}
              <div className="flex flex-col gap-1 text-center">
                <p className="text-[17px] font-semibold text-charcoal leading-relaxed font-sans">
                  We&apos;ll send a 6-digit code<br />to confirm your number.
                </p>
                <p className="text-xs font-normal text-muted leading-relaxed font-sans">
                  Your number is only used for updates about your turnouts,
                  and to let you sign in to manage them.
                </p>
              </div>
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
          onContinue={() => {}}
          continueLabel="Create Turnout"
          continueDisabled
          isSubmitting={isSubmitting}
          previewZone={previewNode}
        >
          <OTPInputForm
            phone={authPhone}
            displayName={displayName}
            onSuccess={doCreate}
          />
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
