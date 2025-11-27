'use client'

import { useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser' // You’ll create this helper
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const supabase = supabaseBrowser()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus(null)

    if (!email) {
      setStatus('Please enter an email.')
      return
    }

    const origin = window.location.origin // e.g., http://localhost:3002
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    })

    if (error) {
      console.error(error)
      setStatus(error.message)
    } else {
      setStatus('✅ Check your email for a login link.')
    }
  }

  return (
    <div className="max-w-md mx-auto mt-16 space-y-4 text-center">
      <h1 className="text-2xl font-bold">Log in to BlockBusters Trivia</h1>
      <form onSubmit={handleLogin} className="space-y-3">
        <Input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Button type="submit" className="w-full">
          Send Magic Link
        </Button>
      </form>
      {status && <p className="text-sm text-muted-foreground">{status}</p>}
    </div>
  )
}
