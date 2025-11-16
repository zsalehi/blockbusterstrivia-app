'use client'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useState } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const supabase = supabaseBrowser()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    await supabase.auth.signInWithOtp({ email })
    alert('Check your email for a login link.')
  }

  return (
    <div className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-bold mb-4">Sign in</h1>
      <form onSubmit={handleLogin} className="space-y-3">
        <input className="w-full border p-2 rounded" placeholder="you@email.com"
               value={email} onChange={(e)=>setEmail(e.target.value)} />
        <button className="rounded bg-black text-white px-4 py-2">Send Magic Link</button>
      </form>
    </div>
  )
}
