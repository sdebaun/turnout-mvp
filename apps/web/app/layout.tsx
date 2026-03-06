import type { Metadata } from 'next'
import { Zilla_Slab, Plus_Jakarta_Sans, Syne } from 'next/font/google'
import './globals.css'

// Zilla Slab: editorial serif for display text and turnout titles.
// Used for hero headlines and card titles — signals "this is a real thing worth showing up for".
const zillaSlab = Zilla_Slab({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-zilla-slab',
  display: 'swap',
})

// Plus Jakarta Sans: the workhorse UI font.
// Warm humanist, readable at small sizes on mobile in all lighting conditions.
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plus-jakarta',
  display: 'swap',
})

// Syne: used exclusively for the wordmark in the top nav.
// Has a slightly quirky geometric personality that gives the brand mark some identity.
const syne = Syne({
  subsets: ['latin'],
  weight: ['700'],
  variable: '--font-syne',
  display: 'swap',
})

export const metadata: Metadata = {
  // metadataBase lets Next.js resolve relative og:image URLs (e.g. /api/venue-photo?placeId=...)
  // into absolute URLs for social media crawlers. Falls back to production URL.
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://turnout.network'),
  title: 'turnout.network',
  description: 'A living network of showing up.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // suppressHydrationWarning: browser extensions (WhatRuns, etc.) inject class
  // attributes onto <html> that React didn't render, causing hydration mismatch
  // warnings in dev mode. Safe here — only suppresses on this one element.
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${zillaSlab.variable} ${plusJakarta.variable} ${syne.variable}`}
    >
      <body className="font-sans">{children}</body>
    </html>
  )
}
