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
import { ConfirmButton } from '@/components/confirm-button'
import { Input } from '@/components/ui/input'
import { AgeFields, EmailInput, exceptionReasonFor, FullNameInput, PhoneInput, type AgeException } from '@/components/checked-input'
import { checkMember, type AgeRule } from '@/lib/validation'

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
      <ConfirmButton
        variant="ghost"
        size="sm"
        disabled={pending}
        message={`Remove ${name} from the team?`}
        confirmLabel="Remove"
        onConfirm={() => run(() => removeMemberAction(memberId))}
      >
        Remove
      </ConfirmButton>
      <Status error={error} done={null} />
    </>
  )
}

// Resolves true only if the browser can actually render the URL as an image.
// Share links (Google Photos/Drive, Dropbox, etc.) load an HTML page, so they fail here.
function loadsAsImage(src: string, timeoutMs = 10000): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    const timer = setTimeout(() => resolve(false), timeoutMs)
    img.onload = () => {
      clearTimeout(timer)
      resolve(img.naturalWidth > 0)
    }
    img.onerror = () => {
      clearTimeout(timer)
      resolve(false)
    }
    img.src = src
  })
}

export function LogoForm({ teamId, initialUrl }: { teamId: string; initialUrl: string }) {
  const [url, setUrl] = useState(initialUrl)
  const [checking, setChecking] = useState(false)
  const [notImage, setNotImage] = useState(false)
  const { pending, error, done, run } = useAction()
  const busy = pending || checking
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault()
        setNotImage(false)
        setChecking(true)
        const ok = await loadsAsImage(url.trim())
        setChecking(false)
        if (!ok) return setNotImage(true)
        run(() => updateLogoAction(teamId, url), 'Logo saved.')
      }}
    >
      <div className="flex gap-2">
        <Input type="url" required placeholder="https://example.com/logo.png" value={url} onChange={(e) => setUrl(e.target.value)} />
        <Button type="submit" disabled={busy}>{checking ? 'Checking…' : 'Save'}</Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Paste a direct link to an image (it usually ends in .png or .jpg). Share links from Google Photos or Drive won’t work.
        Open the image, right-click or long-press it, and choose “Copy image address”.
      </p>
      {notImage ? (
        <p role="alert" className="text-sm text-destructive">
          That link doesn’t open an image, so it can’t be used as a logo. Use the image’s own address instead of a share link.
        </p>
      ) : (
        <Status error={error} done={done} />
      )}
    </form>
  )
}

type Mate = { full_name: string; date_of_birth: string; email: string; phone: string; exception: AgeException }
const blank: Mate = { full_name: '', date_of_birth: '', email: '', phone: '', exception: { requested: false, reason: '' } }

export function AddMembersForm({ teamId, slotsLeft, ageRule }: { teamId: string; slotsLeft: number; ageRule: AgeRule }) {
  const [mates, setMates] = useState<Mate[]>([{ ...blank }])
  const [problem, setProblem] = useState<string | null>(null)
  const { pending, error, done, run } = useAction()
  const set = (i: number, patch: Partial<Mate>) => setMates((m) => m.map((x, j) => (j === i ? { ...x, ...patch } : x)))

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        const payload = mates.map(({ exception, ...m }) => ({ ...m, age_exception_reason: exceptionReasonFor(m.date_of_birth, ageRule, exception) }))
        const bad = payload.map((m, i) => checkMember(m, mates.length > 1 ? `Teammate ${i + 1}` : 'Teammate', ageRule)).find((r) => !r.ok)
        setProblem(bad && !bad.ok ? bad.error : null)
        if (bad) return
        run(() => addMembersAction(teamId, payload), 'Added. Invites are on their way.', () => setMates([{ ...blank }]))
      }}
    >
      {mates.map((m, i) => (
        <div key={i} className="grid gap-3 sm:grid-cols-2">
          <FullNameInput required placeholder="Full name" value={m.full_name} onChange={(e) => set(i, { full_name: e.target.value })} onCleanValue={(v) => set(i, { full_name: v })} />
          <AgeFields
            rule={ageRule}
            showLabel={false}
            value={m.date_of_birth}
            onValueChange={(v) => set(i, { date_of_birth: v })}
            exception={m.exception}
            onExceptionChange={(x) => set(i, { exception: x })}
          />
          <EmailInput placeholder="Email (to send the invite)" value={m.email} onChange={(e) => set(i, { email: e.target.value })} onCleanValue={(v) => set(i, { email: v })} />
          <PhoneInput placeholder="Phone" value={m.phone} onChange={(e) => set(i, { phone: e.target.value })} onCleanValue={(v) => set(i, { phone: v })} />
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
      <Status error={problem ?? error} done={problem ? null : done} />
    </form>
  )
}
