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
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: older browsers without clipboard API
    }
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
    <div className="flex flex-wrap gap-3">
      <button
        onClick={() => copyToClipboard(inviteMessage, setCopiedMessage)}
        className="bg-blue-600 text-white rounded-md py-2 px-4 font-medium hover:bg-blue-700"
        data-testid="copy-invite-button"
      >
        {copiedMessage ? 'Copied!' : 'Copy Invite'}
      </button>

      <button
        onClick={() => copyToClipboard(turnoutUrl, setCopiedLink)}
        className="bg-gray-100 text-gray-800 border border-gray-300 rounded-md py-2 px-4 font-medium hover:bg-gray-200"
        data-testid="copy-link-button"
      >
        {copiedLink ? 'Copied!' : 'Copy Link'}
      </button>

      {canShare && (
        <button
          onClick={handleShare}
          className="bg-gray-100 text-gray-800 border border-gray-300 rounded-md py-2 px-4 font-medium hover:bg-gray-200"
        >
          Share
        </button>
      )}
    </div>
  )
}
