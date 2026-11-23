// src/app/competitions/[id]/page.tsx
import { notFound } from 'next/navigation'
import { joinTeam, createTeam } from '@/app/teams/actions'
import { getSessionUser } from '@/lib/session'
import { query, queryOne } from '@/lib/db'
import { isRegistrationOpen } from '@/lib/competition'
import { Button } from '@/components/ui/button'

type Competition = {
  id: string
  title: string
  description: string | null
  registration_opens: Date | null
  registration_closes: Date | null
}

export default async function CompetitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getSessionUser()

  const comp = /^[0-9a-f-]{36}$/i.test(id)
    ? await queryOne<Competition>(
        `select id, title, description, registration_opens, registration_closes
           from competitions where id = $1`,
        [id]
      )
    : null
  if (!comp) notFound()

  const teams = await query<{ id: string; name: string }>(
    `select id, name from teams where competition_id = $1 order by created_at`,
    [comp.id]
  )

  const myTeam = user
    ? await queryOne<{ team_id: string }>(
        `select team_id from v_my_teams where user_id = $1 and competition_id = $2`,
        [user.id, comp.id]
      )
    : null
  const myTeamId = myTeam?.team_id ?? null

  const registrationOpen = isRegistrationOpen(comp)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">{comp.title}</h1>
        <p className="text-muted-foreground">{comp.description}</p>
      </header>

      {!user ? (
        <p className="text-sm">
          Please <a href={`/login?next=${encodeURIComponent(`/competitions/${comp.id}`)}`} className="underline">log in</a> to join a team.
        </p>
      ) : myTeamId ? (
        <p className="rounded border p-3 bg-muted/40">
          You’re already on a team for this competition.
        </p>
      ) : !registrationOpen ? (
        <p className="rounded border p-3 bg-muted/40">
          Registration is currently closed.
        </p>
      ) : null}

      {/* CREATE TEAM FORM */}
      {user && registrationOpen && !myTeamId ? (
        <div className="border rounded p-4 mb-6">
          <h2 className="text-xl font-semibold mb-2">Create a Team</h2>
          <form
            action={async (formData) => {
              'use server'
              formData.set('competition_id', id)
              await createTeam(formData)
            }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <input
              type="text"
              name="name"
              placeholder="Team name"
              required
              className="border rounded px-3 py-2 flex-1"
            />
            <button
              type="submit"
              className="bg-black text-white rounded px-4 py-2"
            >
              Create Team
            </button>
          </form>
        </div>
      ) : null}
      
      <section>
        <h2 className="text-xl font-semibold mb-2">Teams</h2>
        {teams.length ? (
          <ul className="space-y-2">
            {teams.map((t) => (
              <li key={t.id} className="flex items-center justify-between border rounded p-3">
                <div>
                  <p className="font-medium">{t.name}</p>
                  {/* Optional: show captain, members, etc. */}
                </div>

                {/* Only show Join if user is eligible */}
                {user && !myTeamId && registrationOpen ? (
                  <form action={joinTeam}>
                    <input type="hidden" name="team_id" value={t.id} />
                    <Button type="submit" size="sm" variant="secondary">
                      Join Team
                    </Button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No teams yet. Be the first to create one.</p>
        )}
      </section>
    </div>
  )
}
