import type { Metadata } from 'next'
import Link from 'next/link'
import { format } from 'date-fns'
import { query } from '@/lib/db'
import { requireOrganizerPage } from '@/lib/authz'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Your competitions' }
export const dynamic = 'force-dynamic'

export default async function OrganizerHome() {
  const viewer = await requireOrganizerPage('/organizer')
  const orgs = viewer.isAdmin
    ? await query<{ id: string; name: string }>(`select id, name from organizations order by name`)
    : viewer.orgs
  const comps = await query<{ id: string; organization_id: string | null; title: string; status: string; start_at: Date | null; teams: number; max_teams: number | null }>(
    `select c.id, c.organization_id, c.title, c.status, c.start_at, c.max_teams,
            (select count(*)::int from teams t where t.competition_id = c.id) as teams
       from competitions c
      where $1 or c.organization_id in (select organization_id from organization_members where user_id = $2)
      order by c.start_at desc nulls last`,
    [viewer.isAdmin, viewer.user.id]
  )

  return (
    <div className="space-y-10">
      <div>
        <p className="eyebrow">Organizer portal</p>
        <h1 className="mt-2 text-3xl font-bold">Your competitions</h1>
      </div>
      {orgs.map((o) => {
        const list = comps.filter((c) => c.organization_id === o.id)
        return (
          <section key={o.id} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl font-semibold">
                <Link href={`/organizer/orgs/${o.id}`} className="hover:underline">{o.name}</Link>
              </h2>
              <Button asChild size="sm"><Link href={`/organizer/competitions/new?org=${o.id}`}>New competition</Link></Button>
            </div>
            <ul className="divide-y rounded-xl border bg-card">
              {list.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <Link href={`/organizer/competitions/${c.id}`} className="font-medium hover:underline">{c.title}</Link>
                    <p className="text-xs capitalize text-muted-foreground">{c.status}{c.start_at ? ` · starts ${format(c.start_at, 'MMM d, yyyy')}` : ''}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">{c.teams}{c.max_teams ? ` / ${c.max_teams}` : ''} teams</span>
                </li>
              ))}
              {!list.length && <li className="p-4 text-muted-foreground">No competitions yet.</li>}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
