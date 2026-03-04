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

      {/* Full-width sage header background; content constrained to match the body below. */}
      <div className="relative flex-shrink-0 bg-sage">
        <div className="lg:max-w-5xl lg:mx-auto">
          <header className="px-5 pt-5 pb-5 h-36 flex flex-col lg:px-10">
            <h1 className="font-heading font-bold text-[28px] leading-tight text-offwhite">
              {headerTitle}
            </h1>
            <p className="text-sm font-normal text-white/80 mt-1.5 leading-[1.4]">
              {headerSubtitle}
            </p>
          </header>
        </div>

        {/* Pips straddle the full-width header/body seam — centered always.
            Attempting left-alignment relative to the constrained content container
            is more trouble than it's worth given the absolute positioning context. */}
        {currentStep !== undefined && (
          <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 z-10">
            <PipIndicator current={currentStep} total={4} />
          </div>
        )}
      </div>

      {/* Outer: flex-1 fills remaining height. Using flex (row) so mx-auto on the inner
          constrained box actually centers it — mx-auto on a flex-col child doesn't absorb
          horizontal space reliably, but on a flex-row child it does. bg-warm shows on the
          sides beyond the 5xl max-width box. */}
      <div className="flex-1 flex bg-warm">

        {/* Inner: constrained to max-w-5xl, centered, stretches full height via
            align-items:stretch (default). Switches to row at desktop when preview present. */}
        <div className={`flex-1 max-w-5xl mx-auto flex flex-col ${
          hasPreview ? 'lg:flex-row' : ''
        }`}>

          {/* Left column: mobile preview (hidden on desktop) + form */}
          <div className={`flex flex-col ${hasPreview ? 'lg:w-[55%]' : ''}`}>

            {/* Preview zone — mobile only. Desktop right column handles it.
                pt-6 breathes above the pip bottom half. */}
            {previewZone && (
              <div className="bg-offwhite px-5 pt-6 pb-5 lg:hidden">
                {previewZone}
              </div>
            )}

            {/* Form zone. Step 0 gets centered + constrained; steps 1-4 fill left column. */}
            <div className={`bg-warm px-5 pb-6 flex flex-col gap-4 ${
              previewZone ? 'pt-5' : 'pt-6'
            } lg:px-10 lg:pt-6 ${hasPreview ? 'lg:flex-1' : 'lg:max-w-xl lg:mx-auto lg:w-full'}`}>
              {children}
            </div>
          </div>

          {/* Right column: preview card, desktop only.
              Stretches full height (no sticky/self-start) so offwhite bg fills all the way
              down to the action bar. */}
          {previewZone && (
            <div className="hidden lg:flex lg:flex-col lg:w-[45%] lg:bg-offwhite lg:items-center lg:justify-start lg:pt-12 lg:px-8">
              <div className="w-full max-w-sm">
                {previewZone}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky action bar — full-width bg + border. Content constrained to match body above.
          Buttons sit at the left edge of the content container via the inner max-w-xs wrapper. */}
      <div className="sticky bottom-0 z-10 bg-offwhite border-t border-separator">
        <div className="lg:max-w-5xl lg:mx-auto">
          <div className="flex items-center px-4 py-3 gap-2 lg:max-w-xs">
            <button
              type="button"
              onClick={onBack}
              disabled={!onBack}
              className={`flex-1 h-12 rounded-lg bg-white border border-sage/30 text-charcoal text-base font-medium font-sans flex items-center justify-center transition-opacity ${
                !onBack ? 'opacity-40' : 'hover:bg-warm'
              }`}
            >
              <ChevronLeft size={18} strokeWidth={2.5} />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={onContinue}
              disabled={continueIsDisabled}
              className={`flex-1 h-12 rounded-lg text-white text-base font-semibold font-sans flex items-center justify-center gap-1 transition-colors ${
                continueIsDisabled ? 'bg-terracotta/60 cursor-not-allowed' : 'bg-terracotta hover:bg-terracotta/90 cursor-pointer'
              }`}
            >
              <span>{isSubmitting ? 'Working...' : continueLabel}</span>
              {!isSubmitting && <ChevronRight size={18} strokeWidth={2.5} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
