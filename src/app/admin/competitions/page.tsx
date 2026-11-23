import type { Metadata } from 'next'
import Link from 'next/link'
import { format } from 'date-fns'
import { query } from '@/lib/db'
import { requireAdminPage } from '@/lib/authz'

export const metadata: Metadata = { title: 'Competitions' }
export const dynamic = 'force-dynamic'

export default async function AdminCompetitions() {
  await requireAdminPage('/admin/competitions')
  const rows = await query<{ id: string; title: string; status: string; org: string | null; start_at: Date | null; teams: number; max_teams: number | null }>(
    `select c.id, c.title, c.status, c.start_at, c.max_teams, o.name as org,
            (select count(*)::int from teams t where t.competition_id = c.id) as teams
       from competitions c left join organizations o on o.id = c.organization_id
      order by c.start_at desc nulls last`
  )
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">All competitions</h1>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b text-muted-foreground">
            <tr><th className="p-3">Competition</th><th className="p-3">Organization</th><th className="p-3">Status</th><th className="p-3">Starts</th><th className="p-3">Teams</th></tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((c) => (
              <tr key={c.id}>
                <td className="p-3"><Link href={`/organizer/competitions/${c.id}`} className="font-medium hover:underline">{c.title}</Link></td>
                <td className="p-3 text-muted-foreground">{c.org ?? '—'}</td>
                <td className="p-3 capitalize">{c.status}</td>
                <td className="p-3 text-muted-foreground">{c.start_at ? format(c.start_at, 'MMM d, yyyy') : '—'}</td>
                <td className="p-3">{c.teams}{c.max_teams ? ` / ${c.max_teams}` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
