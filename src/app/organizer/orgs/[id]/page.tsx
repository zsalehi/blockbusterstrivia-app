import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { query, queryOne } from '@/lib/db'
import { UUID_RE, requireOrganizerPage, roleIn } from '@/lib/authz'
import { Button } from '@/components/ui/button'
import { AddMemberForm, OrgSettingsForm, RemoveMemberButton } from '../../organizer-controls'

export const metadata: Metadata = { title: 'Organization' }
export const dynamic = 'force-dynamic'

export default async function OrgPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const viewer = await requireOrganizerPage(`/organizer/orgs/${id}`)
  if (!UUID_RE.test(id)) notFound()
  const org = await queryOne<{ id: string; name: string; slug: string; description: string | null }>(
    `select id, name, slug, description from organizations where id = $1`,
    [id]
  )
  const role = roleIn(viewer, id)
  if (!org || (!viewer.isAdmin && !role)) notFound()
  const canManage = viewer.isAdmin || role === 'owner'

  const members = await query<{ user_id: string; role: string; name: string; email: string }>(
    `select m.user_id, m.role, u.name, u.email from organization_members m join "user" u on u.id = m.user_id
      where m.organization_id = $1 order by (m.role = 'owner') desc, u.name`,
    [id]
  )
  const comps = await query<{ id: string; title: string; status: string; teams: number }>(
    `select c.id, c.title, c.status, (select count(*)::int from teams t where t.competition_id = c.id) as teams
       from competitions c where c.organization_id = $1 order by c.start_at desc nulls last`,
    [id]
  )

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow"><Link href="/organizer" className="hover:underline">Organizer portal</Link></p>
          <h1 className="mt-2 text-3xl font-bold">{org.name}</h1>
          {org.description && <p className="mt-2 text-muted-foreground">{org.description}</p>}
        </div>
        <Button asChild><Link href={`/organizer/competitions/new?org=${org.id}`}>New competition</Link></Button>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Competitions</h2>
        <ul className="divide-y rounded-xl border bg-card">
          {comps.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 p-4">
              <Link href={`/organizer/competitions/${c.id}`} className="font-medium hover:underline">{c.title}</Link>
              <span className="text-sm text-muted-foreground"><span className="capitalize">{c.status}</span> · {c.teams} teams</span>
            </li>
          ))}
          {!comps.length && <li className="p-4 text-muted-foreground">No competitions yet.</li>}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Team</h2>
        <p className="text-sm text-muted-foreground">Owners manage people and settings. Managers run competitions and see rosters.</p>
        <ul className="divide-y rounded-xl border bg-card">
          {members.map((m) => (
            <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{m.name}</p>
                <p className="truncate text-sm text-muted-foreground">{m.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-secondary px-2 py-0.5 text-xs capitalize">{m.role}</span>
                {canManage && <RemoveMemberButton orgId={org.id} userId={m.user_id} name={m.name} />}
              </div>
            </li>
          ))}
        </ul>
        {canManage && <AddMemberForm orgId={org.id} />}
      </section>

      {canManage && (
        <OrgSettingsForm orgId={org.id} name={org.name} slug={org.slug} description={org.description ?? ''} />
      )}
    </div>
  )
}
