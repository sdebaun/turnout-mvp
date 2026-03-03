'use client'

import React from 'react'

// Pip dots track progress through the wizard — amber filled, skeleton empty.
// Not shown on step 0 (expertise fork) — only meaningful once the actual form begins.
function PipIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-2 mt-3" aria-label={`Step ${current} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className="w-2.5 h-2.5 rounded-full"
          style={{
            backgroundColor: i < current ? '#C8831A' : '#DDD8D0',
          }}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

interface WizardLayoutProps {
  headerTitle: string
  headerSubtitle: string
  // if provided (1-4), shows pip indicator in header
  currentStep?: number
  onBack?: () => void
  onContinue: () => void
  continueLabel: string
  continueDisabled?: boolean
  isSubmitting?: boolean
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
  children,
}: WizardLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-cream">
      {/* Sticky top nav — sage green strip with wordmark */}
      <nav className="sticky top-0 z-10 h-12 flex items-center justify-center" style={{ backgroundColor: '#3D6B52' }}>
        <span className="text-white font-heading text-lg font-bold">turnout.network</span>
      </nav>

      {/* Green header: headline + subtitle + optional pip indicator */}
      <header className="px-4 pb-5 pt-4" style={{ backgroundColor: '#3D6B52' }}>
        <h1 className="font-heading text-white text-2xl font-bold leading-tight">{headerTitle}</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(250,250,247,0.7)' }}>{headerSubtitle}</p>
        {currentStep !== undefined && (
          <PipIndicator current={currentStep} total={4} />
        )}
      </header>

      {/* Scrollable body — cream background, grows to fill available space */}
      <main className="flex-1 px-4 py-4 space-y-4 overflow-y-auto" style={{ backgroundColor: '#FAF4E8' }}>
        {children}
      </main>

      {/* Sticky action bar — back ghost left, CTA amber right */}
      <div
        className="sticky bottom-0 border-t px-4 py-3 flex justify-between items-center bg-white"
        style={{ borderColor: '#DDD8D0' }}
      >
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-medium px-3 py-2 rounded-lg"
            style={{ color: '#1E2420' }}
          >
            &lsaquo; Back
          </button>
        ) : (
          <div />
        )}
        <button
          type="button"
          onClick={onContinue}
          disabled={continueDisabled || isSubmitting}
          className="px-6 py-2.5 rounded-lg text-white font-medium text-sm min-w-[140px] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#C8831A' }}
        >
          {isSubmitting ? 'Working...' : continueLabel}
        </button>
      </div>
    </div>
  )
}
