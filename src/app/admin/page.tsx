import Link from 'next/link'
import { query, queryOne } from '@/lib/db'
import { requireAdminPage } from '@/lib/authz'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function AdminHome() {
  await requireAdminPage('/admin')
  const stats = (await queryOne<Record<string, number>>(
    `select (select count(*)::int from "user") as users,
            (select count(*)::int from organizations) as orgs,
            (select count(*)::int from competitions) as competitions,
            (select count(*)::int from teams) as teams,
            (select count(*)::int from team_members) as players,
            (select count(*)::int from team_invitations where status = 'pending' and expires_at > now()) as pending_invites`
  ))!
  const open = await query<{ id: string; title: string; org: string | null; teams: number; max_teams: number | null }>(
    `select c.id, c.title, o.name as org, c.max_teams, (select count(*)::int from teams t where t.competition_id = c.id) as teams
       from competitions c left join organizations o on o.id = c.organization_id
      where c.status <> 'complete' order by c.start_at nulls last limit 8`
  )
  const recent = await query<{ id: string; name: string; competition_id: string; competition: string; created_at: Date }>(
    `select t.id, t.name, t.competition_id, c.title as competition, t.created_at
       from teams t join competitions c on c.id = t.competition_id order by t.created_at desc limit 8`
  )

  const cards: [string, number][] = [
    ['Users', stats.users], ['Organizations', stats.orgs], ['Competitions', stats.competitions],
    ['Teams', stats.teams], ['Players on rosters', stats.players], ['Pending invites', stats.pending_invites],
  ]

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-bold">Overview</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {cards.map(([label, n]) => (
          <div key={label} className="rounded-xl border bg-card p-4">
            <p className="font-display text-3xl font-bold">{n}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-display text-xl font-semibold">Active and upcoming</h2>
          <ul className="divide-y rounded-xl border bg-card">
            {open.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <Link href={`/organizer/competitions/${c.id}`} className="block truncate font-medium hover:underline">{c.title}</Link>
                  <p className="text-xs text-muted-foreground">{c.org ?? 'No organization'}</p>
                </div>
                <span className="shrink-0 text-sm text-muted-foreground">{c.teams}{c.max_teams ? ` / ${c.max_teams}` : ''} teams</span>
              </li>
            ))}
            {!open.length && <li className="p-3 text-muted-foreground">Nothing running.</li>}
          </ul>
        </section>
        <section>
          <h2 className="mb-3 font-display text-xl font-semibold">Latest registrations</h2>
          <ul className="divide-y rounded-xl border bg-card">
            {recent.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{t.name}</p>
                  <Link href={`/organizer/competitions/${t.competition_id}`} className="text-xs text-muted-foreground hover:underline">{t.competition}</Link>
                </div>
                <span className="shrink-0 text-sm text-muted-foreground">{format(t.created_at, 'MMM d')}</span>
              </li>
            ))}
            {!recent.length && <li className="p-3 text-muted-foreground">No teams yet.</li>}
          </ul>
        </section>
      </div>
    </div>
  )
}
