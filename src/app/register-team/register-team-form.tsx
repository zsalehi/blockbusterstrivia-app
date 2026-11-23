'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { registerTeamAction } from '@/app/teams/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Member = { full_name: string; date_of_birth: string; email: string; handle: string; phone: string }
const blank: Member = { full_name: '', date_of_birth: '', email: '', handle: '', phone: '' }

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}

export function RegisterTeamForm({ competitionId, captain }: { competitionId: string; captain: Member }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [teamName, setTeamName] = useState('')
  const [captainInfo, setCaptainInfo] = useState<Member>(captain)
  const [mates, setMates] = useState<Member[]>([{ ...blank }])

  const setMate = (i: number, patch: Partial<Member>) =>
    setMates((m) => m.map((x, j) => (j === i ? { ...x, ...patch } : x)))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await registerTeamAction({
        competitionId,
        teamName,
        members: [{ role: 'captain', ...captainInfo }, ...mates.map((m) => ({ role: 'member', ...m }))],
      })
      if (!res.ok) {
        setError(res.error)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      router.push(`/team?id=${res.teamId}&registered=1`)
    })
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      {error && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {error}
        </p>
      )}

      <section className="space-y-4 rounded-xl border bg-card p-5">
        <h2 className="font-display text-xl font-semibold">Team</h2>
        <Field label="Team name">
          <Input required maxLength={80} value={teamName} onChange={(e) => setTeamName(e.target.value)} />
        </Field>
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-5">
        <h2 className="font-display text-xl font-semibold">You (captain)</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <Input required value={captainInfo.full_name} onChange={(e) => setCaptainInfo({ ...captainInfo, full_name: e.target.value })} />
          </Field>
          <Field label="Date of birth">
            <Input required type="date" value={captainInfo.date_of_birth} onChange={(e) => setCaptainInfo({ ...captainInfo, date_of_birth: e.target.value })} />
          </Field>
          <Field label="Email" hint="The email you logged in with.">
            <Input readOnly value={captainInfo.email} />
          </Field>
          <Field label="Phone">
            <Input type="tel" value={captainInfo.phone} onChange={(e) => setCaptainInfo({ ...captainInfo, phone: e.target.value })} />
          </Field>
          <Field label="Handle (optional)">
            <Input value={captainInfo.handle} onChange={(e) => setCaptainInfo({ ...captainInfo, handle: e.target.value })} />
          </Field>
        </div>
      </section>

      {mates.map((m, i) => (
        <section key={i} className="space-y-4 rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Teammate {i + 1}</h2>
            {mates.length > 1 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setMates(mates.filter((_, j) => j !== i))}>
                <X /> Remove
              </Button>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <Input required value={m.full_name} onChange={(e) => setMate(i, { full_name: e.target.value })} />
            </Field>
            <Field label="Date of birth">
              <Input required type="date" value={m.date_of_birth} onChange={(e) => setMate(i, { date_of_birth: e.target.value })} />
            </Field>
            <Field label="Email" hint="We’ll send their invite here.">
              <Input type="email" value={m.email} onChange={(e) => setMate(i, { email: e.target.value })} />
            </Field>
            <Field label="Phone">
              <Input type="tel" value={m.phone} onChange={(e) => setMate(i, { phone: e.target.value })} />
            </Field>
            <Field label="Handle (optional)">
              <Input value={m.handle} onChange={(e) => setMate(i, { handle: e.target.value })} />
            </Field>
          </div>
        </section>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        {mates.length < 3 && (
          <Button type="button" variant="outline" onClick={() => setMates([...mates, { ...blank }])}>
            <Plus /> Add teammate
          </Button>
        )}
        <Button type="submit" size="lg" disabled={pending} className="ml-auto">
          {pending ? 'Registering…' : 'Register team'}
        </Button>
      </div>
    </form>
  )
}
