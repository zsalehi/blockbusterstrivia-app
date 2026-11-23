import type { Metadata } from 'next'
import Link from 'next/link'
import { query } from '@/lib/db'
import { requireAdminPage } from '@/lib/authz'
import { CreateOrgForm, DeleteOrgButton } from '../admin-controls'

export const metadata: Metadata = { title: 'Organizations' }
export const dynamic = 'force-dynamic'

export default async function AdminOrganizations() {
  await requireAdminPage('/admin/organizations')
  const orgs = await query<{ id: string; name: string; slug: string; members: number; competitions: number }>(
    `select o.id, o.name, o.slug,
            (select count(*)::int from organization_members m where m.organization_id = o.id) as members,
            (select count(*)::int from competitions c where c.organization_id = o.id) as competitions
       from organizations o order by o.name`
  )
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Organizations</h1>
      <p className="max-w-2xl text-muted-foreground">
        An organization is a community that runs its own competitions. Its owners and managers can create competitions and see only their own teams.
      </p>
      <ul className="divide-y rounded-xl border bg-card">
        {orgs.map((o) => (
          <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <Link href={`/organizer/orgs/${o.id}`} className="font-medium hover:underline">{o.name}</Link>
              <p className="text-xs text-muted-foreground">{o.slug} · {o.members} member{o.members === 1 ? '' : 's'} · {o.competitions} competition{o.competitions === 1 ? '' : 's'}</p>
            </div>
            {o.competitions === 0 && <DeleteOrgButton orgId={o.id} name={o.name} />}
          </li>
        ))}
      </ul>
      <CreateOrgForm />
    </div>
  )
}
