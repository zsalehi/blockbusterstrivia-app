'use client'

import { useState } from 'react'
import {
  addOrgMemberAction,
  createCompetitionAction,
  decideAgeExceptionAction,
  deleteCompetitionAction,
  removeOrgMemberAction,
  removeTeamAction,
  updateCompetitionAction,
  updateOrganizationAction,
} from './actions'
import { Status, useAction } from '@/components/action-ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { APP_TIMEZONE, fromLocalInput, toLocalInput } from '@/lib/tz'

const FORMATS = [
  ['single_elim', 'Single elimination'],
  ['double_elim', 'Double elimination'],
  ['groups', 'Groups'],
  ['swiss', 'Swiss'],
  ['custom', 'Custom'],
] as const
const STATUSES = [
  ['upcoming', 'Upcoming'],
  ['active', 'Active'],
  ['complete', 'Complete'],
] as const

const selectClass =
  'border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30'

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}

export type CompetitionValues = {
  title: string
  description: string
  status: string
  format: string
  max_teams: number | null
  min_age: number | null
  max_age: number | null
  registration_opens: string | null
  registration_closes: string | null
  start_at: string | null
  end_at: string | null
}

export function CompetitionForm({ orgId, competitionId, values }: { orgId?: string; competitionId?: string; values?: CompetitionValues }) {
  const [v, setV] = useState({
    title: values?.title ?? '',
    description: values?.description ?? '',
    status: values?.status ?? 'upcoming',
    format: values?.format ?? 'single_elim',
    max_teams: values?.max_teams ? String(values.max_teams) : '',
    min_age: values?.min_age ? String(values.min_age) : '',
    max_age: values?.max_age ? String(values.max_age) : '',
    registration_opens: toLocalInput(values?.registration_opens),
    registration_closes: toLocalInput(values?.registration_closes),
    start_at: toLocalInput(values?.start_at),
    end_at: toLocalInput(values?.end_at),
  })
  const { pending, error, done, run, router } = useAction()
  const set = (patch: Partial<typeof v>) => setV((x) => ({ ...x, ...patch }))

  const payload = () => ({
    ...v,
    registration_opens: fromLocalInput(v.registration_opens),
    registration_closes: fromLocalInput(v.registration_closes),
    start_at: fromLocalInput(v.start_at),
    end_at: fromLocalInput(v.end_at),
  })

  return (
    <form
      className="space-y-5 rounded-xl border bg-card p-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (competitionId) run(() => updateCompetitionAction(competitionId, payload()), { done: 'Saved.' })
        else run(() => createCompetitionAction(orgId!, payload()), { refresh: false, onOk: (res) => router.push(`/organizer/competitions/${res.id}`) })
      }}
    >
      <Field label="Title">
        <Input required value={v.title} onChange={(e) => set({ title: e.target.value })} placeholder="2027 Men's Tier 1" />
      </Field>
      <Field label="Description" hint="Shown on the public competition page.">
        <textarea
          className="border-input min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
          value={v.description}
          onChange={(e) => set({ description: e.target.value })}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Status">
          <select className={selectClass} value={v.status} onChange={(e) => set({ status: e.target.value })}>
            {STATUSES.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
          </select>
        </Field>
        <Field label="Format">
          <select className={selectClass} value={v.format} onChange={(e) => set({ format: e.target.value })}>
            {FORMATS.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
          </select>
        </Field>
        <Field label="Maximum teams" hint="Blank means no limit.">
          <Input type="number" min={1} max={1000} value={v.max_teams} onChange={(e) => set({ max_teams: e.target.value })} />
        </Field>
        <Field label="Minimum age" hint="Younger players can request an exception.">
          <Input type="number" inputMode="numeric" min={1} max={99} value={v.min_age} onChange={(e) => set({ min_age: e.target.value })} />
        </Field>
        <Field label="Maximum age" hint="Hard limit, no exceptions.">
          <Input type="number" inputMode="numeric" min={1} max={99} value={v.max_age} onChange={(e) => set({ max_age: e.target.value })} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Registration opens">
          <Input type="datetime-local" value={v.registration_opens} onChange={(e) => set({ registration_opens: e.target.value })} />
        </Field>
        <Field label="Registration closes">
          <Input type="datetime-local" value={v.registration_closes} onChange={(e) => set({ registration_closes: e.target.value })} />
        </Field>
        <Field label="Competition starts">
          <Input type="datetime-local" value={v.start_at} onChange={(e) => set({ start_at: e.target.value })} />
        </Field>
        <Field label="Competition ends">
          <Input type="datetime-local" value={v.end_at} onChange={(e) => set({ end_at: e.target.value })} />
        </Field>
      </div>
      <p className="text-xs text-muted-foreground">
        Times are in {APP_TIMEZONE.replace('_', ' ')} time. Ages are checked on the start date (or the day someone registers, if there’s no start date). Blank ages mean no limit. Leave both registration dates blank to keep registration always open.
      </p>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>{competitionId ? 'Save changes' : 'Create competition'}</Button>
        <Status error={error} done={done} />
      </div>
    </form>
  )
}

export function RemoveTeamButton({ teamId, name }: { teamId: string; name: string }) {
  const { pending, error, run } = useAction()
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (confirm(`Remove team "${name}" from this competition? Its roster and invites are deleted.`)) run(() => removeTeamAction(teamId))
        }}
      >
        Remove team
      </Button>
      <Status error={error} done={null} />
    </>
  )
}

export function AgeExceptionButtons({ memberId, name, status }: { memberId: string; name: string; status: 'requested' | 'approved' | 'denied' }) {
  const { pending, error, run } = useAction()
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {status !== 'approved' && (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => {
            if (confirm(`Approve an age exception for ${name}?`)) run(() => decideAgeExceptionAction(memberId, 'approved'))
          }}
        >
          Approve
        </Button>
      )}
      {status !== 'denied' && (
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => {
            if (confirm(`Deny the age exception for ${name}? Their captain will see it wasn’t approved.`)) run(() => decideAgeExceptionAction(memberId, 'denied'))
          }}
        >
          Deny
        </Button>
      )}
      <Status error={error} done={null} />
    </span>
  )
}

export function DeleteCompetitionButton({ competitionId, orgId }: { competitionId: string; orgId: string | null }) {
  const { pending, error, run, router } = useAction()
  return (
    <div className="space-y-2">
      <Button
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (confirm('Delete this competition? This can’t be undone.')) {
            run(() => deleteCompetitionAction(competitionId), { refresh: false, onOk: () => router.push(orgId ? `/organizer/orgs/${orgId}` : '/organizer') })
          }
        }}
      >
        Delete competition
      </Button>
      <Status error={error} done={null} />
    </div>
  )
}

export function OrgSettingsForm({ orgId, name, slug, description }: { orgId: string; name: string; slug: string; description: string }) {
  const [v, setV] = useState({ name, slug, description })
  const { pending, error, done, run } = useAction()
  return (
    <form
      className="space-y-3 rounded-xl border bg-card p-5"
      onSubmit={(e) => {
        e.preventDefault()
        run(() => updateOrganizationAction(orgId, v), { done: 'Saved.' })
      }}
    >
      <h2 className="font-display text-lg font-semibold">Organization details</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input required aria-label="Name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        <Input required aria-label="Short name" value={v.slug} onChange={(e) => setV({ ...v, slug: e.target.value })} />
      </div>
      <Input aria-label="Description" placeholder="Description (optional)" value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>Save</Button>
        <Status error={error} done={done} />
      </div>
    </form>
  )
}

export function AddMemberForm({ orgId }: { orgId: string }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'manager' | 'owner'>('manager')
  const { pending, error, done, run } = useAction()
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        run(() => addOrgMemberAction(orgId, email, role), { done: 'Added.', onOk: () => setEmail('') })
      }}
    >
      <div className="flex flex-wrap gap-2">
        <Input className="min-w-56 flex-1" required type="email" aria-label="Member email" placeholder="Email of someone who has logged in" value={email} onChange={(e) => setEmail(e.target.value)} />
        <select aria-label="Role" className={`${selectClass} w-auto`} value={role} onChange={(e) => setRole(e.target.value as 'manager' | 'owner')}>
          <option value="manager">Manager</option>
          <option value="owner">Owner</option>
        </select>
        <Button type="submit" disabled={pending}>Add</Button>
      </div>
      <Status error={error} done={done} />
    </form>
  )
}

export function RemoveMemberButton({ orgId, userId, name }: { orgId: string; userId: string; name: string }) {
  const { pending, error, run } = useAction()
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (confirm(`Remove ${name} from this organization?`)) run(() => removeOrgMemberAction(orgId, userId))
        }}
      >
        Remove
      </Button>
      <Status error={error} done={null} />
    </>
  )
}
