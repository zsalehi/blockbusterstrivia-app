import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/session'
import { query } from '@/lib/db'
import { isRegistrationOpen } from '@/lib/competition'
import { PageHeader } from '@/components/page-header'
import { TeamLogo } from '@/components/team-logo'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'My teams' }
export const dynamic = 'force-dynamic'

type MyTeam = { team_id: string; team_name: string; role: string; competition_title: string; logo_url: string | null }
type Comp = { id: string; title: string; registration_opens: Date | null; registration_closes: Date | null }

export default async function TeamsPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login?next=%2Fteams')

  const teams = await query<MyTeam>(
    `select v.team_id, v.team_name, v.role, c.title as competition_title, t.logo_url
       from v_my_teams v
       join teams t on t.id = v.team_id
       join competitions c on c.id = v.competition_id
      where v.user_id = $1
      order by c.start_at nulls last, v.team_name`,
    [user.id]
  )
  const registeredIn = new Set(
    (await query<{ competition_id: string }>(`select competition_id from v_my_teams where user_id = $1`, [user.id])).map(
      (r) => r.competition_id
    )
  )
  const open = (
    await query<Comp>(`select id, title, registration_opens, registration_closes from competitions order by start_at nulls last`)
  ).filter((c) => isRegistrationOpen(c) && !registeredIn.has(c.id))

  return (
    <>
      <PageHeader eyebrow="Your account" title="My teams" />
      <div className="mx-auto max-w-3xl space-y-10 px-4 py-10">
        <section>
          {teams.length ? (
            <ul className="space-y-3">
              {teams.map((t) => (
                <li key={t.team_id} className="flex items-center gap-4 rounded-xl border bg-card p-4">
                  <TeamLogo url={t.logo_url} name={t.team_name} className="size-12" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg font-semibold">{t.team_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {t.competition_title} · {t.role === 'captain' ? 'Captain' : 'Player'}
                    </p>
                  </div>
                  <Button variant="outline" asChild>
                    <Link href={`/team?id=${t.team_id}`}>{t.role === 'captain' ? 'Manage' : 'View'}</Link>
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border bg-card p-6 text-muted-foreground">
              You’re not on a team yet. Register one below, or open the invite link your captain emailed you.
            </p>
          )}
        </section>

        {open.length > 0 && (
          <section>
            <h2 className="mb-3 font-display text-xl font-semibold">Registration is open</h2>
            <ul className="space-y-3">
              {open.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4">
                  <span className="font-medium">{c.title}</span>
                  <Button asChild>
                    <Link href={`/register-team?competition_id=${c.id}`}>Register a team</Link>
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  )
}
