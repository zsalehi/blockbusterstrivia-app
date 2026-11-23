'use client'

import { useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function LoginForm({ next, initialError }: { next: string; initialError?: string }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<string | null>(initialError ?? null)
  const [sending, setSending] = useState(false)

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus(null)
    setSending(true)

    const { error } = await authClient.signIn.magicLink({
      email,
      callbackURL: next,
      errorCallbackURL: '/login?error=auth',
    })

    setSending(false)
    setStatus(error ? error.message ?? 'Could not send the login link.' : 'Check your email for a login link.')
  }

  return (
    <>
      <form onSubmit={handleLogin} className="space-y-3">
        <Input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Button type="submit" className="w-full" disabled={sending}>
          {sending ? 'Sending…' : 'Send Magic Link'}
        </Button>
      </form>
      {status && <p className="text-sm text-muted-foreground">{status}</p>}
    </>
  )
}
