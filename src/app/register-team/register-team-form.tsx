'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { registerTeamAction } from '@/app/teams/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AgeFields, EmailInput, exceptionReasonFor, FullNameInput, HandleInput, PhoneInput, TeamNameInput, type AgeException } from '@/components/checked-input'
import { checkMember, checkTeamName, type AgeRule } from '@/lib/validation'

type Member = { full_name: string; date_of_birth: string; email: string; handle: string; phone: string; exception: AgeException }
const noException: AgeException = { requested: false, reason: '' }
const blank: Member = { full_name: '', date_of_birth: '', email: '', handle: '', phone: '', exception: noException }

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}

type CaptainDefaults = Omit<Member, 'exception'>

// Bring the error banner into view; jump instead of gliding for people who asked for reduced motion.
function scrollToTop() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: reduce ? 'instant' : 'smooth' })
}

export function RegisterTeamForm({ competitionId, captain, ageRule }: { competitionId: string; captain: CaptainDefaults; ageRule: AgeRule }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [teamName, setTeamName] = useState('')
  const [captainInfo, setCaptainInfo] = useState<Member>({ ...captain, exception: noException })
  const [mates, setMates] = useState<Member[]>([{ ...blank }])

  const setMate = (i: number, patch: Partial<Member>) =>
    setMates((m) => m.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  // What the server receives: the exception reason only when it still applies.
  const toInput = ({ exception, ...m }: Member) => ({ ...m, age_exception_reason: exceptionReasonFor(m.date_of_birth, ageRule, exception) })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    // Same checks the server runs; catches anything the field-level checks let through.
    const problem = [
      checkTeamName(teamName),
      checkMember(toInput(captainInfo), 'You (captain)', ageRule),
      ...mates.map((m, i) => checkMember(toInput(m), `Teammate ${i + 1}`, ageRule)),
    ].find((r) => !r.ok)
    if (problem && !problem.ok) {
      setError(problem.error)
      scrollToTop()
      return
    }
    startTransition(async () => {
      const res = await registerTeamAction({
        competitionId,
        teamName,
        members: [{ role: 'captain', ...toInput(captainInfo) }, ...mates.map((m) => ({ role: 'member', ...toInput(m) }))],
      })
      if (!res.ok) {
        setError(res.error)
        scrollToTop()
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
          <TeamNameInput required value={teamName} onChange={(e) => setTeamName(e.target.value)} onCleanValue={setTeamName} />
        </Field>
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-5">
        <h2 className="font-display text-xl font-semibold">You (captain)</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <FullNameInput required value={captainInfo.full_name} onChange={(e) => setCaptainInfo({ ...captainInfo, full_name: e.target.value })} onCleanValue={(v) => setCaptainInfo((c) => ({ ...c, full_name: v }))} />
          </Field>
          <AgeFields
            rule={ageRule}
            value={captainInfo.date_of_birth}
            onValueChange={(v) => setCaptainInfo((c) => ({ ...c, date_of_birth: v }))}
            exception={captainInfo.exception}
            onExceptionChange={(x) => setCaptainInfo((c) => ({ ...c, exception: x }))}
          />
          <Field label="Email" hint="The email you logged in with.">
            <Input readOnly value={captainInfo.email} />
          </Field>
          <Field label="Phone">
            <PhoneInput value={captainInfo.phone} onChange={(e) => setCaptainInfo({ ...captainInfo, phone: e.target.value })} onCleanValue={(v) => setCaptainInfo((c) => ({ ...c, phone: v }))} />
          </Field>
          <Field label="Handle (optional)">
            <HandleInput value={captainInfo.handle} onChange={(e) => setCaptainInfo({ ...captainInfo, handle: e.target.value })} onCleanValue={(v) => setCaptainInfo((c) => ({ ...c, handle: v }))} />
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
              <FullNameInput required value={m.full_name} onChange={(e) => setMate(i, { full_name: e.target.value })} onCleanValue={(v) => setMate(i, { full_name: v })} />
            </Field>
            <AgeFields
              rule={ageRule}
              value={m.date_of_birth}
              onValueChange={(v) => setMate(i, { date_of_birth: v })}
              exception={m.exception}
              onExceptionChange={(x) => setMate(i, { exception: x })}
            />
            <Field label="Email" hint="We’ll send their invite here.">
              <EmailInput value={m.email} onChange={(e) => setMate(i, { email: e.target.value })} onCleanValue={(v) => setMate(i, { email: v })} />
            </Field>
            <Field label="Phone">
              <PhoneInput value={m.phone} onChange={(e) => setMate(i, { phone: e.target.value })} onCleanValue={(v) => setMate(i, { phone: v })} />
            </Field>
            <Field label="Handle (optional)">
              <HandleInput value={m.handle} onChange={(e) => setMate(i, { handle: e.target.value })} onCleanValue={(v) => setMate(i, { handle: v })} />
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
