'use client'

import { useState } from 'react'
import { createOrganizationAction, deleteOrganizationAction, setPlatformRoleAction } from './actions'
import { Status, useAction } from '@/components/action-ui'
import { Button } from '@/components/ui/button'
import { ConfirmButton } from '@/components/confirm-button'
import { Input } from '@/components/ui/input'

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)

export function CreateOrgForm() {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [description, setDescription] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const { pending, error, run, router } = useAction()

  return (
    <form
      className="space-y-3 rounded-xl border bg-card p-5"
      onSubmit={(e) => {
        e.preventDefault()
        run(() => createOrganizationAction({ name, slug, description, ownerEmail }), {
          refresh: false,
          onOk: (res) => router.push(`/organizer/orgs/${res.id}`),
        })
      }}
    >
      <h2 className="font-display text-lg font-semibold">New organization</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          required
          aria-label="Organization name"
          placeholder="Name, e.g. Ottawa Youth Trivia"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (!slugTouched) setSlug(slugify(e.target.value))
          }}
        />
        <Input
          required
          aria-label="Short name"
          placeholder="short-name"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true)
            setSlug(e.target.value)
          }}
        />
      </div>
      <Input aria-label="Description" placeholder="One-line description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
      <Input
        type="email"
        aria-label="Owner email"
        placeholder="Owner's email (they must have logged in once)"
        value={ownerEmail}
        onChange={(e) => setOwnerEmail(e.target.value)}
      />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>Create organization</Button>
        <Status error={error} done={null} />
      </div>
    </form>
  )
}

export function DeleteOrgButton({ orgId, name }: { orgId: string; name: string }) {
  const { pending, error, run } = useAction()
  return (
    <>
      <ConfirmButton
        variant="ghost"
        size="sm"
        disabled={pending}
        message={`Delete ${name}? This can't be undone.`}
        confirmLabel="Delete"
        onConfirm={() => run(() => deleteOrganizationAction(orgId))}
      >
        Delete
      </ConfirmButton>
      <Status error={error} done={null} />
    </>
  )
}

export function RoleButton({ userId, name, isAdmin }: { userId: string; name: string; isAdmin: boolean }) {
  const { pending, error, run } = useAction()
  return (
    <div className="flex items-center gap-2">
      <ConfirmButton
        variant={isAdmin ? 'outline' : 'ghost'}
        size="sm"
        disabled={pending}
        message={isAdmin ? `Remove admin access from ${name}?` : `Make ${name} a platform admin? They'll see every competition and all player contact details.`}
        confirmLabel={isAdmin ? 'Remove admin' : 'Make admin'}
        onConfirm={() => run(() => setPlatformRoleAction(userId, isAdmin ? 'player' : 'admin'))}
      >
        {isAdmin ? 'Remove admin' : 'Make admin'}
      </ConfirmButton>
      <Status error={error} done={null} />
    </div>
  )
}
