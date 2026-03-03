'use client'

import React from 'react'
import { ChevronRight } from 'lucide-react'

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
  return (
    <div className="min-h-screen flex flex-col bg-warm">
      {/* Top nav — dark forest green (#243D30), 56px, Syne Bold wordmark, centered. */}
      <nav className="sticky top-0 z-10 h-14 flex items-center justify-center bg-forest flex-shrink-0">
        <span className="font-syne font-bold text-[13px] text-offwhite tracking-[0.01em]">
          turnout.network
        </span>
      </nav>

      {/* Header wrapper is relative so we can absolutely position the pip straddler.
          The pip is centered on the header/body seam via bottom-0 + translate-y-1/2. */}
      <div className="relative flex-shrink-0">
        {/* h-36 = 144px fixed — matches design spec. pt-5 pb-5 provides internal breathing room. */}
        <header className="bg-sage px-5 pt-5 pb-5 h-36 flex flex-col">
          <h1 className="font-heading font-bold text-[28px] leading-tight text-offwhite">
            {headerTitle}
          </h1>
          <p className="text-sm font-normal text-white/80 mt-1.5 leading-[1.4]">
            {headerSubtitle}
          </p>
        </header>

        {/* Pips straddle the header/body boundary: absolute at header bottom, shifted down 50%.
            The top 8px sits over the sage header, the bottom 8px over the body background. */}
        {currentStep !== undefined && (
          <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 z-10">
            <PipIndicator current={currentStep} total={4} />
          </div>
        )}
      </div>

      {/* Scrollable body — two distinct zones stacked vertically.
          previewZone: off-white (#FAFAF7). formZone: warm tan (#F0EDE8).
          pt-4 on previewZone gives breathing room above the pip that straddles in. */}
      <main className="flex-1 overflow-y-auto">
        {previewZone && (
          <div className="bg-offwhite px-5 pt-6 pb-5">
            {previewZone}
          </div>
        )}
        {/* When no previewZone, pt-4 gives room for the bottom half of the pips */}
        <div className={`bg-warm px-5 pb-6 flex flex-col gap-4 ${previewZone ? 'pt-5' : 'pt-6'}`}>
          {children}
        </div>
      </main>

      {/* Sticky action bar — off-white bg, top border, side-by-side equal-width buttons.
          Back: outlined ghost white. Continue: solid terracotta with chevron icon. */}
      <div className="sticky bottom-0 z-10 flex items-center bg-offwhite border-t border-separator px-4 py-3 gap-2">
        {/* Back button — always rendered per spec. Disabled and faded when onBack is absent. */}
        <button
          type="button"
          onClick={onBack ?? undefined}
          disabled={!onBack}
          className={`flex-1 h-12 rounded-lg bg-white border border-sage/30 text-charcoal text-base font-medium font-sans flex items-center justify-center transition-opacity ${
            !onBack ? 'opacity-40' : 'hover:bg-warm'
          }`}
        >
          Back
        </button>

        {/* CTA button — terracotta fill, white text, chevron icon. Dims when disabled. */}
        <button
          type="button"
          onClick={onContinue}
          disabled={continueDisabled || isSubmitting}
          className={`flex-1 h-12 rounded-lg text-white text-base font-semibold font-sans flex items-center justify-center gap-1 transition-colors ${
            continueDisabled || isSubmitting
              ? 'bg-terracotta/60 cursor-not-allowed'
              : 'bg-terracotta hover:bg-terracotta/90 cursor-pointer'
          }`}
        >
          <span>{isSubmitting ? 'Working...' : continueLabel}</span>
          {!isSubmitting && <ChevronRight size={18} strokeWidth={2.5} />}
        </button>
      </div>
    </div>
  )
}
