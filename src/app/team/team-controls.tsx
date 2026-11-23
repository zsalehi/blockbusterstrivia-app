'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  addMembersAction,
  cancelInviteAction,
  removeMemberAction,
  resendInviteAction,
  updateLogoAction,
  type ActionResult,
} from '@/app/teams/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function useAction() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  function run<T extends object>(fn: () => Promise<ActionResult<T>>, doneMessage?: string, onOk?: () => void) {
    setError(null)
    setDone(null)
    startTransition(async () => {
      const res = await fn()
      if (!res.ok) return setError(res.error)
      if (doneMessage) setDone(doneMessage)
      onOk?.()
      router.refresh()
    })
  }
  return { pending, error, done, run }
}

function Status({ error, done }: { error: string | null; done: string | null }) {
  if (error) return <p role="alert" className="text-sm text-destructive">{error}</p>
  if (done) return <p role="status" className="text-sm text-emerald-400">{done}</p>
  return null
}

export function InviteActions({ invitationId, status }: { invitationId: string; status: string }) {
  const { pending, error, done, run } = useAction()
  return (
    <>
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => resendInviteAction(invitationId), 'Invite sent.')}>
        {status === 'pending' ? 'Resend' : 'Re-invite'}
      </Button>
      {status === 'pending' && (
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => cancelInviteAction(invitationId))}>
          Cancel
        </Button>
      )}
      <Status error={error} done={done} />
    </>
  )
}

export function RemoveMemberButton({ memberId, name }: { memberId: string; name: string }) {
  const { pending, error, run } = useAction()
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (confirm(`Remove ${name} from the team?`)) run(() => removeMemberAction(memberId))
        }}
      >
        Remove
      </Button>
      <Status error={error} done={null} />
    </>
  )
}

export function LogoForm({ teamId, initialUrl }: { teamId: string; initialUrl: string }) {
  const [url, setUrl] = useState(initialUrl)
  const { pending, error, done, run } = useAction()
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        run(() => updateLogoAction(teamId, url), 'Logo saved.')
      }}
    >
      <div className="flex gap-2">
        <Input type="url" required placeholder="https://example.com/logo.png" value={url} onChange={(e) => setUrl(e.target.value)} />
        <Button type="submit" disabled={pending}>Save</Button>
      </div>
      <p className="text-xs text-muted-foreground">Paste a link to an image of your team logo.</p>
      <Status error={error} done={done} />
    </form>
  )
}

type Mate = { full_name: string; date_of_birth: string; email: string; phone: string }
const blank: Mate = { full_name: '', date_of_birth: '', email: '', phone: '' }

export function AddMembersForm({ teamId, slotsLeft }: { teamId: string; slotsLeft: number }) {
  const [mates, setMates] = useState<Mate[]>([{ ...blank }])
  const { pending, error, done, run } = useAction()
  const set = (i: number, patch: Partial<Mate>) => setMates((m) => m.map((x, j) => (j === i ? { ...x, ...patch } : x)))

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        run(() => addMembersAction(teamId, mates), 'Added. Invites are on their way.', () => setMates([{ ...blank }]))
      }}
    >
      {mates.map((m, i) => (
        <div key={i} className="grid gap-3 sm:grid-cols-2">
          <Input required placeholder="Full name" value={m.full_name} onChange={(e) => set(i, { full_name: e.target.value })} />
          <Input required type="date" aria-label="Date of birth" value={m.date_of_birth} onChange={(e) => set(i, { date_of_birth: e.target.value })} />
          <Input type="email" placeholder="Email (to send the invite)" value={m.email} onChange={(e) => set(i, { email: e.target.value })} />
          <Input type="tel" placeholder="Phone" value={m.phone} onChange={(e) => set(i, { phone: e.target.value })} />
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        {mates.length < slotsLeft && (
          <Button type="button" variant="outline" onClick={() => setMates([...mates, { ...blank }])}>
            Add another
          </Button>
        )}
        <Button type="submit" disabled={pending}>{pending ? 'Adding…' : 'Add & send invites'}</Button>
      </div>
      <Status error={error} done={done} />
    </form>
  )
}
