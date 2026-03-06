'use client'

import { useState, useEffect } from 'react'

interface ShareButtonsProps {
  inviteMessage: string
  turnoutUrl: string
  turnoutTitle: string
}

export function ShareButtons({ inviteMessage, turnoutUrl, turnoutTitle }: ShareButtonsProps) {
  const [copiedMessage, setCopiedMessage] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  // Defer navigator.share check to after hydration to avoid mismatch
  const [canShare, setCanShare] = useState(false)

  useEffect(() => {
    // Only show Share on touch devices — on desktop the native share sheet is
    // an unfamiliar OS popup that confuses users. Copy buttons handle desktop fine.
    setCanShare(
      typeof navigator !== 'undefined' &&
      'share' in navigator &&
      navigator.maxTouchPoints > 0
    )
  }, [])

  async function copyToClipboard(text: string, setCopied: (v: boolean) => void) {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // execCommand fallback for non-HTTPS or older browsers
      const el = document.createElement('textarea')
      el.value = text
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleShare() {
    if (!navigator.share) return
    try {
      await navigator.share({
        title: turnoutTitle,
        text: inviteMessage,
        url: turnoutUrl,
      })
    } catch {
      // User cancelled share — that's fine
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Primary share button — mobile gets native share sheet, desktop gets copy */}
      {canShare ? (
        <button
          onClick={handleShare}
          className="w-full h-12 rounded-lg bg-terracotta text-white font-semibold text-base flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
          data-testid="share-button"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          Share
        </button>
      ) : (
        <button
          onClick={() => copyToClipboard(turnoutUrl, setCopiedLink)}
          className="w-full h-12 rounded-lg bg-terracotta text-white font-semibold text-base flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
          data-testid="copy-link-button"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
          {copiedLink ? 'Copied!' : 'Copy Link'}
        </button>
      )}

      {/* Secondary: copy invite message (desktop only — mobile has the share sheet) */}
      {!canShare && (
        <button
          onClick={() => copyToClipboard(inviteMessage, setCopiedMessage)}
          className="w-full h-10 rounded-lg bg-warm border border-separator text-charcoal text-sm font-medium flex items-center justify-center transition-colors hover:bg-separator"
          data-testid="copy-invite-button"
        >
          {copiedMessage ? 'Invite text copied!' : 'Copy Invite Text'}
        </button>
      )}
    </div>
  )
}
