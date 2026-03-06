'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { User } from '@prisma/client'
import { WizardLayout } from '@/app/components/templates/wizard-layout'
import { TurnoutPreview } from '@/app/components/organisms/turnout-preview'
import { OptionGroup } from '@/app/components/molecules/option-group'
import { OTPInputForm } from '../../auth/components/otp-input-form'
import { DateField } from '@/app/components/molecules/fields/date-field'
import { TimeField } from '@/app/components/molecules/fields/time-field'
import { LocationField } from '@/app/components/molecules/fields/location-field'
import { TextInputField } from '@/app/components/molecules/fields/text-input-field'
import { DisplayNameField } from '@/app/components/molecules/fields/display-name-field'
import { PhoneField } from '@/app/components/molecules/fields/phone-field'
import { createGroupWithTurnoutAction } from '../actions'
import { checkPhoneAction, sendOTPAction } from '../../auth/actions'
import { useWizardSession, type WizardState } from './use-wizard-session'
import { useSubmit } from '../../hooks/use-submit'

type WizardStep = 0 | 1 | 2 | 3 | 4

interface OrganizeFormProps {
  user: User | null
}

export function OrganizeForm({ user }: OrganizeFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Step is driven PURELY from URL param — no useState.
  // This lets you navigate directly to any step via ?step=N for dev/debugging,
  // and means browser back/forward just works — no step state to sync.
  const urlStep = parseInt(searchParams.get('step') ?? '0', 10)
  const step = ([0, 1, 2, 3, 4].includes(urlStep) ? urlStep : 0) as WizardStep

  const goToStep = (n: WizardStep) => router.push(`/organize?step=${n}`)

  const { state, update, clearSession } = useWizardSession()
  const { isSubmitting, submitError, setSubmitError, withSubmit } = useSubmit()

  const doCreate = () => withSubmit(async () => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const result = await createGroupWithTurnoutAction({
      groupName: state.groupName, mission: state.groupName, turnoutTitle: state.turnoutTitle,
      location: state.location!, turnoutDate: state.turnoutDate, turnoutTime: state.turnoutTime, turnoutTimezone: timezone,
    })
    if ('error' in result) { setSubmitError(result.error); return }
    clearSession()
    router.push(`/t/${result.turnoutSlug}`)
  })

  const handleSendCode = () => withSubmit(async () => {
    const checkResult = await checkPhoneAction(state.phone)
    if ('error' in checkResult) { setSubmitError(checkResult.error); return }

    const sendResult = await sendOTPAction(state.phone)
    if ('error' in sendResult) { setSubmitError(sendResult.error); return }

    goToStep(4)
  })

  const step1Ready = Boolean(state.turnoutDate && state.turnoutTime && state.location)
  const step2Ready = Boolean(state.groupName.trim() && state.turnoutTitle.trim())
  const step3Ready = Boolean(state.displayName.trim() && state.phone.length >= 10)

  const locationCity = state.location?.formattedAddress?.split(',').slice(-2).join(',').trim()
  const preview = (
    <TurnoutPreview
      date={state.turnoutDate || undefined}
      time={state.turnoutTime || undefined}
      locationName={state.location?.name}
      locationCity={locationCity}
      groupName={state.groupName || undefined}
      turnoutTitle={state.turnoutTitle || undefined}
      displayName={user?.displayName ?? (state.displayName || undefined)}
    />
  )

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
            options={[
              { value: 'new', label: 'Starting something new', description: 'You have a cause or idea and want to bring people together around it.' },
              { value: 'existing', label: 'Already organizing', description: 'You have an existing group you want to use turnout.network for.' },
            ]}
            value={state.expertisePath}
            onChange={(v) => update({ expertisePath: v as WizardState['expertisePath'] })}
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
          previewZone={preview}
          error={submitError}
        >
          <DateField value={state.turnoutDate} onChange={(v) => update({ turnoutDate: v })} />
          <TimeField value={state.turnoutTime} onChange={(v) => update({ turnoutTime: v })} />
          <LocationField value={state.location} onChange={(v) => update({ location: v })} />
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
          previewZone={preview}
          error={submitError}
        >
          <TextInputField label="Group" value={state.groupName} onChange={(v) => update({ groupName: v })} placeholder="Save Willow Creek, Local Love Project..." maxLength={100} data-testid="group-name" />
          <TextInputField label="Turnout" value={state.turnoutTitle} onChange={(v) => update({ turnoutTitle: v })} placeholder="Planning Meeting, Kickoff, March..." maxLength={100} data-testid="turnout-title" />
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
          previewZone={preview}
          error={submitError}
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
              <DisplayNameField value={state.displayName} onChange={(v) => update({ displayName: v })} />
              <PhoneField value={state.phone} onChange={(v) => update({ phone: v })} />
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
          previewZone={preview}
          error={submitError}
        >
          <OTPInputForm phone={state.phone} displayName={state.displayName} onSuccess={doCreate} />
        </WizardLayout>
      )}
    </>
  )
}
