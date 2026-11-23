import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/session'
import { query, queryOne } from '@/lib/db'
import { MAX_TEAM_SIZE } from '@/lib/team-service'
import { PageHeader } from '@/components/page-header'
import { TeamLogo } from '@/components/team-logo'
import { Button } from '@/components/ui/button'
import { AddMembersForm, InviteActions, LogoForm, RemoveMemberButton } from './team-controls'

export const metadata: Metadata = { title: 'Manage team' }
export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Member = {
  id: string
  user_id: string | null
  role: string
  full_name: string
  handle: string | null
  phone: string | null
  member_email: string | null
  age: number | null
  invitation_id: string | null
  invitation_status: string | null
  invitation_expired: boolean | null
}

function slotStatus(m: Member): { label: string; tone: string } {
  if (m.user_id) return { label: 'Joined', tone: 'text-emerald-400' }
  if (m.invitation_status === 'pending' && !m.invitation_expired) return { label: 'Invite sent', tone: 'text-brand-yellow' }
  if (m.invitation_status === 'pending' || m.invitation_status === 'expired') return { label: 'Invite expired', tone: 'text-muted-foreground' }
  if (m.invitation_status === 'revoked') return { label: 'Invite cancelled', tone: 'text-muted-foreground' }
  return { label: m.member_email ? 'Not invited' : 'No email', tone: 'text-muted-foreground' }
}

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; registered?: string }>
}) {
  const { id = '', registered } = await searchParams
  const here = `/team?id=${encodeURIComponent(id)}`

  const user = await getSessionUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(here)}`)

  const team = UUID.test(id)
    ? await queryOne<{ id: string; name: string; logo_url: string | null; captain_user_id: string | null; competition_id: string; competition_title: string }>(
        `select t.id, t.name, t.logo_url, t.captain_user_id, t.competition_id, c.title as competition_title
           from teams t join competitions c on c.id = t.competition_id where t.id = $1`,
        [id]
      )
    : null

  const isMember = team
    ? !!(await queryOne(`select 1 from team_members where team_id = $1 and user_id = $2`, [team.id, user.id]))
    : false

  if (!team || !isMember) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-3xl font-bold">Team not found</h1>
        <p className="mt-3 text-muted-foreground">This team doesn’t exist, or you’re not on it.</p>
        <Button className="mt-6" asChild>
          <Link href="/teams">My teams</Link>
        </Button>
      </div>
    )
  }

  const isCaptain = team.captain_user_id === user.id

  const members = await query<Member>(
    `select tm.id, tm.user_id, tm.role, tm.full_name, tm.handle, tm.phone, tm.member_email,
            case when tm.date_of_birth is not null
                 then extract(year from age(current_date, tm.date_of_birth))::int end as age,
            i.id as invitation_id, i.status as invitation_status, (i.expires_at < now()) as invitation_expired
       from team_members tm
       left join lateral (
         select id, status, expires_at from team_invitations
          where team_member_id = tm.id order by created_at desc limit 1
       ) i on true
      where tm.team_id = $1
      order by (tm.role = 'captain') desc, tm.created_at`,
    [team.id]
  )

  return (
    <>
      <PageHeader eyebrow={team.competition_title} title={team.name} />
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
        {registered && (
          <p role="status" className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm">
            Your team is registered. Invites have been emailed to your teammates, and they’ll appear as “Joined” once they accept.
          </p>
        )}

        <section className="rounded-xl border bg-card p-5">
          <div className="mb-4 flex items-center gap-4">
            <TeamLogo url={team.logo_url} name={team.name} className="size-14" />
            <h2 className="font-display text-xl font-semibold">Roster</h2>
            <span className="ml-auto text-sm text-muted-foreground">{members.length} / {MAX_TEAM_SIZE}</span>
          </div>

          <ul className="divide-y divide-border">
            {members.map((m) => {
              const status = slotStatus(m)
              return (
                <li key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {m.full_name}
                      {m.role === 'captain' && <span className="ml-2 text-xs uppercase tracking-wide text-brand-yellow">Captain</span>}
                    </p>
                    {isCaptain && (
                      <p className="truncate text-sm text-muted-foreground">
                        {[m.member_email, m.phone, m.age !== null ? `Age ${m.age}` : null].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  <span className={`text-sm ${status.tone}`}>{status.label}</span>
                  {isCaptain && m.role !== 'captain' && (
                    <div className="flex items-center gap-1">
                      {m.invitation_id && !m.user_id && (
                        <InviteActions invitationId={m.invitation_id} status={m.invitation_status!} />
                      )}
                      <RemoveMemberButton memberId={m.id} name={m.full_name} />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>

        {isCaptain && members.length < MAX_TEAM_SIZE && (
          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-4 font-display text-xl font-semibold">Add teammates</h2>
            <AddMembersForm teamId={team.id} slotsLeft={MAX_TEAM_SIZE - members.length} />
          </section>
        )}

        {isCaptain && (
          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-4 font-display text-xl font-semibold">Team logo</h2>
            <LogoForm teamId={team.id} initialUrl={team.logo_url ?? ''} />
          </section>
        )}
      </div>
    </>
  )
}
