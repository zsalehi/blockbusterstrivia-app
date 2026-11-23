'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type Portals = { admin: boolean; organizer: boolean }

function useAccount() {
  const router = useRouter()
  const { data, isPending } = authClient.useSession()
  const user = data?.user ?? null
  const [portals, setPortals] = useState<Portals>({ admin: false, organizer: false })

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    fetch('/api/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => !cancelled && p && setPortals(p))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const links = [
    { href: '/teams', label: 'My teams' },
    { href: '/profile', label: 'My profile' },
    ...(portals.organizer ? [{ href: '/organizer', label: 'Organizer portal' }] : []),
    ...(portals.admin ? [{ href: '/admin', label: 'Admin portal' }] : []),
  ]

  async function logout() {
    await authClient.signOut()
    router.push('/')
    router.refresh()
  }

  return { user, isPending, links, logout }
}

const displayName = (u: { name?: string | null; email: string }) => (u.name && u.name.trim()) || u.email.split('@')[0]

export function AccountMenu() {
  const { user, isPending, links, logout } = useAccount()

  if (isPending) return <div className="hidden h-9 w-24 md:block" aria-hidden />
  if (!user) {
    return (
      <Link href="/login" className="hidden font-display text-lg tracking-wider text-muted-foreground transition-colors hover:text-foreground md:block">
        Login
      </Link>
    )
  }
  const name = displayName(user)
  return (
    <div className="hidden md:block">
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Account menu"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 font-display text-lg tracking-wider outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-secondary font-display text-base uppercase">{name[0]}</span>
          <span className="max-w-32 truncate">{name}</span>
          <ChevronDown className="size-4 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <span className="block truncate font-medium">{name}</span>
            <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {links.map((l) => (
            <DropdownMenuItem key={l.href} asChild>
              <Link href={l.href}>{l.label}</Link>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={logout}>Log out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

// Rendered inside the mobile menu panel.
export function MobileAccountLinks({ onNavigate }: { onNavigate: () => void }) {
  const { user, isPending, links, logout } = useAccount()
  const row = 'block w-full border-b border-border py-3 text-left text-sm font-medium text-muted-foreground last:border-b-0 hover:text-foreground'
  if (isPending) return null
  if (!user) {
    return (
      <Link href="/login" onClick={onNavigate} className={row}>
        Login
      </Link>
    )
  }
  return (
    <>
      <p className="border-b border-border py-3 text-xs text-muted-foreground">Signed in as {user.email}</p>
      {links.map((l) => (
        <Link key={l.href} href={l.href} onClick={onNavigate} className={row}>
          {l.label}
        </Link>
      ))}
      <button
        type="button"
        className={row}
        onClick={() => {
          onNavigate()
          void logout()
        }}
      >
        Log out
      </button>
    </>
  )
}
