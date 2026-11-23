import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { getSessionUser } from '@/lib/session'
import { query, queryOne } from '@/lib/db'
import { isRegistrationOpen } from '@/lib/competition'
import { PageHeader } from '@/components/page-header'
import { TeamLogo } from '@/components/team-logo'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Competition' }
export const dynamic = 'force-dynamic'

type Competition = {
  id: string
  title: string
  description: string | null
  registration_opens: Date | null
  registration_closes: Date | null
  start_at: Date | null
  end_at: Date | null
}

export default async function CompetitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const comp = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    ? await queryOne<Competition>(
        `select id, title, description, registration_opens, registration_closes, start_at, end_at
           from competitions where id = $1`,
        [id]
      )
    : null
  if (!comp) notFound()

  const user = await getSessionUser()
  const teams = await query<{ id: string; name: string; logo_url: string | null }>(
    `select id, name, logo_url from teams where competition_id = $1 order by name`,
    [comp.id]
  )
  const myTeam = user
    ? await queryOne<{ team_id: string }>(
        `select team_id from v_my_teams where user_id = $1 and competition_id = $2`,
        [user.id, comp.id]
      )
    : null
  const open = isRegistrationOpen(comp)

  return (
    <>
      <PageHeader
        eyebrow={comp.start_at ? `Starts ${format(comp.start_at, 'MMMM d, yyyy')}` : 'Competition'}
        title={comp.title}
        lead={comp.description ?? undefined}
      />
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
        <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-5">
          <p className="flex-1 text-muted-foreground">
            {myTeam
              ? 'Your team is registered for this competition.'
              : open
                ? 'Registration is open.'
                : 'Registration is closed.'}
          </p>
          {myTeam ? (
            <Button asChild>
              <Link href={`/team?id=${myTeam.team_id}`}>Manage your team</Link>
            </Button>
          ) : open ? (
            <Button asChild>
              <Link href={`/register-team?competition_id=${comp.id}`}>Register your team</Link>
            </Button>
          ) : null}
        </div>

        <section>
          <h2 className="mb-3 font-display text-xl font-semibold">
            Teams <span className="text-muted-foreground">({teams.length})</span>
          </h2>
          {teams.length ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {teams.map((t) => (
                <li key={t.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                  <TeamLogo url={t.logo_url} name={t.name} />
                  <span className="truncate font-medium">{t.name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No teams yet.</p>
          )}
        </section>
      </div>
    </>
  )
}
