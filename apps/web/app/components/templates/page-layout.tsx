import type { ReactNode } from 'react'

interface PageLayoutProps {
  topNav: ReactNode
  children: ReactNode
  bottomBar?: ReactNode
}

export function PageLayout({ topNav, children, bottomBar }: PageLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-offwhite">
      {topNav}
      <main className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-3 bg-warm">
          {children}
        </div>
        {bottomBar}
      </main>
    </div>
  )
}
