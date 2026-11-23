import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { queryOne } from "@/lib/db"
import { UUID_RE, requireOrganizerPage, roleIn } from '@/lib/authz'
import { competitionRoster, type RosterRow } from '@/lib/portal-service'
import { Button } from '@/components/ui/button'
import { TeamLogo } from '@/components/team-logo'
import { CompetitionForm, DeleteCompetitionButton, RemoveTeamButton } from '../../organizer-controls'

export const metadata: Metadata = { title: 'Manage competition' }
export const dynamic = 'force-dynamic'

const inviteLabel = (r: RosterRow) =>
  r.joined ? 'Joined' : r.invite_status === 'pending' ? 'Invite sent' : r.invite_status ? `Invite ${r.invite_status}` : 'Not invited'

export default async function ManageCompetition({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const viewer = await requireOrganizerPage(`/organizer/competitions/${id}`)
  if (!UUID_RE.test(id)) notFound()
  const comp = await queryOne<{
    id: string; organization_id: string | null; org_name: string | null; title: string; description: string | null; status: string; format: string
    max_teams: number | null; registration_opens: Date | null; registration_closes: Date | null; start_at: Date | null; end_at: Date | null
  }>(
    `select c.*, o.name as org_name from competitions c left join organizations o on o.id = c.organization_id where c.id = $1`,
    [id]
  )
  if (!comp) notFound()
  const role = comp.organization_id ? roleIn(viewer, comp.organization_id) : null
  if (!viewer.isAdmin && !role) notFound()
  const isOwner = viewer.isAdmin || role === 'owner'

  const roster = await competitionRoster(id)
  const teams = new Map<string, { name: string; logo_url: string | null; members: RosterRow[] }>()
  for (const r of roster) {
    const t = teams.get(r.team_id) ?? { name: r.team_name, logo_url: r.logo_url, members: [] }
    if (r.member_id) t.members.push(r)
    teams.set(r.team_id, t)
  }
  const players = roster.filter((r) => r.member_id).length

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">
            {comp.organization_id ? <Link href={`/organizer/orgs/${comp.organization_id}`} className="hover:underline">{comp.org_name}</Link> : 'No organization'}
          </p>
          <h1 className="mt-2 text-3xl font-bold">{comp.title}</h1>
        </div>
        <Button asChild variant="outline"><Link href={`/competitions/${comp.id}`}>View public page</Link></Button>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Settings</h2>
        <CompetitionForm
          competitionId={comp.id}
          values={{
            title: comp.title,
            description: comp.description ?? '',
            status: comp.status,
            format: comp.format,
            max_teams: comp.max_teams,
            registration_opens: comp.registration_opens?.toISOString() ?? null,
            registration_closes: comp.registration_closes?.toISOString() ?? null,
            start_at: comp.start_at?.toISOString() ?? null,
            end_at: comp.end_at?.toISOString() ?? null,
          }}
        />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">
            Teams <span className="text-muted-foreground">({teams.size}{comp.max_teams ? ` of ${comp.max_teams}` : ''} · {players} players)</span>
          </h2>
          <Button asChild variant="outline" size="sm">
            <a href={`/organizer/competitions/${comp.id}/export`} download>Export roster (CSV)</a>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Rosters include phone numbers and dates of birth. Exports are recorded in the activity log.</p>
        {[...teams.entries()].map(([teamId, t]) => (
          <div key={teamId} className="rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <TeamLogo url={t.logo_url} name={t.name} />
                <h3 className="truncate font-display text-lg font-semibold">{t.name}</h3>
              </div>
              <RemoveTeamButton teamId={teamId} name={t.name} />
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-muted-foreground">
                  <tr><th className="py-1 pr-3">Name</th><th className="py-1 pr-3">Role</th><th className="py-1 pr-3">Email</th><th className="py-1 pr-3">Phone</th><th className="py-1 pr-3">Age</th><th className="py-1">Status</th></tr>
                </thead>
                <tbody className="divide-y">
                  {t.members.map((m) => (
                    <tr key={m.member_id}>
                      <td className="py-1.5 pr-3 font-medium">{m.full_name}</td>
                      <td className="py-1.5 pr-3 capitalize">{m.role}</td>
                      <td className="py-1.5 pr-3 text-muted-foreground">{m.member_email ?? '—'}</td>
                      <td className="py-1.5 pr-3 text-muted-foreground">{m.phone ?? '—'}</td>
                      <td className="py-1.5 pr-3">{m.age ?? '—'}</td>
                      <td className="py-1.5">{inviteLabel(m)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {!teams.size && <p className="text-muted-foreground">No teams have registered yet.</p>}
      </section>

      {isOwner && (
        <section className="space-y-3 rounded-xl border border-destructive/30 p-5">
          <h2 className="font-display text-lg font-semibold">Danger zone</h2>
          <p className="text-sm text-muted-foreground">A competition can only be deleted once it has no teams. Otherwise set its status to complete.</p>
          <DeleteCompetitionButton competitionId={comp.id} orgId={comp.organization_id} />
        </section>
      )}
    </div>
  )
}
