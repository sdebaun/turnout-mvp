import type { Metadata } from 'next'
import { Zilla_Slab, Plus_Jakarta_Sans } from 'next/font/google'
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

export const metadata: Metadata = {
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
      className={`${zillaSlab.variable} ${plusJakarta.variable}`}
    >
      <body className="font-sans">{children}</body>
    </html>
  )
}
