'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function PortalTabs({ tabs }: { tabs: { href: string; label: string }[] }) {
  const pathname = usePathname()
  return (
    <nav aria-label="Portal sections" className="flex flex-wrap gap-x-1 shadow-[inset_0_-1px_0_var(--border)]">
      {tabs.map((t) => {
        const active = t.href === tabs[0].href ? pathname === t.href : pathname.startsWith(t.href)
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'whitespace-nowrap border-b-2 px-4 py-2.5 font-display text-lg tracking-wider transition-colors',
              active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
