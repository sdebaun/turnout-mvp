'use client'

import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { TopNavFocused } from '../../components/top-nav-focused'

// Pip dots track progress — amber filled, off-white empty, both ringed with sage.
// 16x16 circles straddling the header/body seam (absolute positioned, translate-y-1/2).
function PipIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2.5" aria-label={`Step ${current} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`w-4 h-4 rounded-full ring-2 ring-sage flex-shrink-0 ${
            i < current ? 'bg-amber' : 'bg-offwhite'
          }`}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

interface WizardLayoutProps {
  headerTitle: string
  headerSubtitle: string
  // if provided (1-4), shows pip indicator straddling the header/body seam
  currentStep?: number
  onBack?: () => void
  onContinue: () => void
  continueLabel: string
  continueDisabled?: boolean
  isSubmitting?: boolean
  previewZone?: React.ReactNode
  children: React.ReactNode
}

export function WizardLayout({
  headerTitle,
  headerSubtitle,
  currentStep,
  onBack,
  onContinue,
  continueLabel,
  continueDisabled,
  isSubmitting,
  previewZone,
  children,
}: WizardLayoutProps) {
  const continueIsDisabled = continueDisabled || isSubmitting
  const hasPreview = Boolean(previewZone)

  return (
    <div className="min-h-screen flex flex-col bg-warm">
      <TopNavFocused />

      {/* Content wrapper: single column on mobile, two columns on desktop when preview exists.
          lg:items-stretch ensures both columns reach the same height so bg fills correctly. */}
      <div className={`flex-1 flex flex-col ${hasPreview ? 'lg:flex-row lg:items-stretch' : ''}`}>

        {/* Left column: header + (mobile-only preview) + form */}
        <div className={`flex flex-col ${hasPreview ? 'lg:w-[55%]' : ''}`}>

          {/* Header wrapper is relative so the pip straddler can be absolutely positioned.
              On desktop with preview, pips shift left-aligned to the form column (lg:left-10).
              Without preview (step 0), pips stay centered — same as mobile. */}
          <div className="relative flex-shrink-0">
            {/* h-36 = 144px fixed — matches design spec. lg:px-10 widens breathing room on desktop. */}
            <header className="bg-sage px-5 pt-5 pb-5 h-36 flex flex-col lg:px-10">
              <h1 className="font-heading font-bold text-[28px] leading-tight text-offwhite">
                {headerTitle}
              </h1>
              <p className="text-sm font-normal text-white/80 mt-1.5 leading-[1.4]">
                {headerSubtitle}
              </p>
            </header>

            {/* Pips: centered on mobile always; on desktop with preview shift to align with form column.
                -translate-x-0 overrides the centering offset so left-10 takes effect cleanly. */}
            {currentStep !== undefined && (
              <div className={`absolute bottom-0 translate-y-1/2 z-10 ${
                hasPreview
                  ? 'left-1/2 -translate-x-1/2 lg:left-10 lg:-translate-x-0'
                  : 'left-1/2 -translate-x-1/2'
              }`}>
                <PipIndicator current={currentStep} total={4} />
              </div>
            )}
          </div>

          {/* Preview zone — mobile only. Hidden on desktop; the right column takes over there.
              pt-6 gives breathing room above the pip bottom half. */}
          {previewZone && (
            <div className="bg-offwhite px-5 pt-6 pb-5 lg:hidden">
              {previewZone}
            </div>
          )}

          {/* Form zone: warm tan bg, vertically stacked inputs.
              Without preview (step 0), center-constrain on desktop so it doesn't sprawl.
              With preview, let it fill the left column naturally (lg:flex-1). */}
          <div className={`bg-warm px-5 pb-6 flex flex-col gap-4 ${
            previewZone ? 'pt-5' : 'pt-6'
          } lg:px-10 lg:pt-6 ${hasPreview ? 'lg:flex-1' : 'lg:max-w-xl lg:mx-auto lg:w-full'}`}>
            {children}
          </div>
        </div>

        {/* Right column: preview card, desktop only.
            Sticky so the card tracks the user as they scroll through a long form.
            top-12 accounts for the 48px TopNav height so it doesn't hide behind it.
            self-start stops the sticky element from stretching to column height. */}
        {previewZone && (
          <div className="hidden lg:flex lg:flex-col lg:w-[45%] lg:bg-offwhite lg:items-center lg:justify-start lg:pt-12 lg:px-8 lg:sticky lg:top-12 lg:self-start">
            <div className="w-full max-w-sm">
              {previewZone}
            </div>
          </div>
        )}
      </div>

      {/* Sticky action bar — full width on all screen sizes.
          Buttons: flex-1 (equal fill) on mobile; fixed width on desktop so they don't
          stretch across a 1200px viewport like a bad banner ad. */}
      <div className="sticky bottom-0 z-10 flex items-center bg-offwhite border-t border-separator px-4 py-3 gap-2">
        {/* Back button — always rendered per spec. Disabled and faded when onBack is absent. */}
        <button
          type="button"
          onClick={onBack}
          disabled={!onBack}
          className={`flex-1 lg:flex-none lg:w-32 h-12 rounded-lg bg-white border border-sage/30 text-charcoal text-base font-medium font-sans flex items-center justify-center transition-opacity ${
            !onBack ? 'opacity-40' : 'hover:bg-warm'
          }`}
        >
          <ChevronLeft size={18} strokeWidth={2.5} />
          <span>Back</span>
        </button>

        {/* CTA button — terracotta fill, white text, chevron icon. Dims when disabled.
            lg:w-44 gives it a comfortable width without dominating the action bar. */}
        <button
          type="button"
          onClick={onContinue}
          disabled={continueIsDisabled}
          className={`flex-1 lg:flex-none lg:w-44 h-12 rounded-lg text-white text-base font-semibold font-sans flex items-center justify-center gap-1 transition-colors ${
            continueIsDisabled ? 'bg-terracotta/60 cursor-not-allowed' : 'bg-terracotta hover:bg-terracotta/90 cursor-pointer'
          }`}
        >
          <span>{isSubmitting ? 'Working...' : continueLabel}</span>
          {!isSubmitting && <ChevronRight size={18} strokeWidth={2.5} />}
        </button>
      </div>
    </div>
  )
}
