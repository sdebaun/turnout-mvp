'use client'

import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { TopNav } from '../../components/top-nav'

// Pips now live inside the header — no longer straddling the header/body seam.
// Amber = completed, off-white = not yet, both ringed with sage.
function PipIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div
      className="flex items-center gap-2.5"
      data-testid="pip-indicator"
      aria-label={`Step ${current} of ${total}`}
    >
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
  // if provided (1-4), shows pip indicator inside the header, below title/subtitle
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
    <div className="min-h-screen flex flex-col bg-warm" data-testid="wizard-layout">
      <TopNav variant="focused" />

      {/* Full-width sage header. Desktop height is auto to accommodate pips below the text. */}
      <div className="flex-shrink-0 bg-sage">
        <div className="lg:max-w-5xl lg:mx-auto">
          <header
            className="px-5 pt-5 pb-5 h-36 lg:h-auto flex flex-col lg:px-10 lg:pt-8 lg:pb-6 lg:justify-center"
            data-testid="wizard-header"
          >
            <h1 className="font-heading font-bold text-[28px] lg:text-[34px] leading-tight text-offwhite">
              {headerTitle}
            </h1>
            <p className="text-sm font-normal text-white/80 mt-1.5 leading-[1.4]">
              {headerSubtitle}
            </p>
            {/* Pips sit below the subtitle — no longer floated to straddle the seam */}
            {currentStep !== undefined && (
              <div className="mt-4">
                <PipIndicator current={currentStep} total={4} />
              </div>
            )}
          </header>
        </div>
      </div>

      {/* Body: warm (form) + sage-wash (preview sidebar) on desktop, stacked on mobile.
          The preview column's bg-sage-wash fills its own column — no absolute bleed needed. */}
      <main className="flex-1 flex bg-warm" data-testid="wizard-body">
        <div className={`flex-1 flex flex-col ${hasPreview ? 'lg:flex-row' : ''}`}>

          {/* Form column: full-width on mobile, 60% on desktop */}
          <div className={`flex flex-col ${hasPreview ? 'lg:w-3/5' : ''}`}>

            {/* Preview zone — mobile only. Desktop sidebar handles it. */}
            {previewZone && (
              <div className="bg-offwhite px-5 pt-6 pb-5 lg:hidden">
                {previewZone}
              </div>
            )}

            {/* Form zone. Step 0 (no preview) gets centered + constrained; steps 1-4 fill left column.
                lg:pr-40 prevents fields from stretching the full 60% column width. */}
            <div
              className={`bg-warm px-5 pb-6 flex flex-col gap-4 ${
                previewZone ? 'pt-5' : 'pt-6'
              } ${
                hasPreview
                  ? 'lg:px-10 lg:pr-40 lg:pt-6 lg:flex-1'
                  : 'lg:max-w-xl lg:mx-auto lg:w-full lg:pt-6 lg:px-10'
              }`}
              data-testid="wizard-form"
            >
              {children}
            </div>
          </div>

          {/* Preview sidebar — desktop only, 40% width, sage-wash background.
              Top-aligned so the card sits near the header rather than floating mid-column. */}
          {previewZone && (
            <div
              className="hidden lg:flex lg:flex-col lg:w-2/5 bg-sage-wash lg:justify-start lg:pt-10 lg:px-12 lg:pb-8"
              data-testid="wizard-preview"
            >
              <div className="w-full max-w-[380px]">
                {previewZone}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Sticky action bar — always centered regardless of preview presence */}
      <div
        className="sticky bottom-0 z-10 bg-offwhite border-t border-separator"
        data-testid="wizard-action-bar"
      >
        <div className="flex items-center px-4 py-3 gap-2 lg:max-w-xl lg:mx-auto lg:w-full">
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
  )
}
