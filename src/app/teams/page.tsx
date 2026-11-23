import type { Metadata } from 'next'
import { createTeam, inviteToTeam, revokeInviteAction } from './actions'
import { getSessionUser } from '@/lib/session'
import { query } from '@/lib/db'
import { isRegistrationOpen } from '@/lib/competition'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'My Teams' }
export const dynamic = 'force-dynamic'

type MyTeam = {
  team_id: string
  team_name: string
  role: 'captain' | 'member'
  competition_title: string
}

type PendingInvite = {
  id: string
  team_id: string
  invitee_email: string
  expires_at: Date
  token: string
}

type OpenCompetition = {
  id: string
  title: string
  registration_opens: Date | null
  registration_closes: Date | null
}

export default async function TeamsPage() {
  const user = await getSessionUser()
  if (!user) {
    return (
      <p className="text-center mt-10">
        Please <a href="/login?next=%2Fteams" className="underline">log in</a> to view your teams.
      </p>
    )
  }

  const teams = await query<MyTeam>(
    `select team_id, team_name, role, competition_title
       from v_my_teams where user_id = $1 order by team_name`,
    [user.id]
  )

  const invites = teams.length
    ? await query<PendingInvite>(
        `select id, team_id, invitee_email, expires_at, token
           from team_invitations
          where team_id = any($1) and status = 'pending' and expires_at > now()
          order by created_at desc`,
        [teams.map((t) => t.team_id)]
      )
    : []

  const invitesByTeam = new Map<string, PendingInvite[]>()
  for (const inv of invites) {
    invitesByTeam.set(inv.team_id, [...(invitesByTeam.get(inv.team_id) ?? []), inv])
  }

  const competitions = (
    await query<OpenCompetition>(
      `select id, title, registration_opens, registration_closes
         from competitions order by start_at nulls last`
    )
  ).filter((c) => isRegistrationOpen(c))

  return (
    <div className="max-w-xl mx-auto space-y-8 px-4 py-8">
      <section>
        <h1 className="text-3xl font-bold mb-2">My Teams</h1>
        {teams.length ? (
          <ul className="space-y-2">
            {teams.map((t) => {
              const teamInvites = invitesByTeam.get(t.team_id) ?? []
              return (
                <li key={t.team_id} className="border rounded p-3 space-y-3">
                  <div>
                    <p className="font-semibold">{t.team_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Competition: {t.competition_title} • Role: {t.role}
                    </p>
                  </div>

                  {t.role === 'captain' && (
                    <form action={inviteToTeam} className="flex flex-wrap gap-2 items-center">
                      <input type="hidden" name="team_id" value={t.team_id} />
                      <Input type="email" name="email" placeholder="Invite by email" required className="max-w-sm" />
                      <Button type="submit">Invite</Button>
                    </form>
                  )}

                  {t.role === 'captain' && teamInvites.length > 0 && (
                    <div className="rounded bg-muted/30 p-3">
                      <p className="text-sm font-medium mb-2">Pending invites</p>
                      <ul className="space-y-1">
                        {teamInvites.map((inv) => (
                          <li key={inv.id} className="flex items-center justify-between text-sm">
                            <span>{inv.invitee_email}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">
                                expires {inv.expires_at.toLocaleString()}
                              </span>
                              <a className="underline" href={`/invite?token=${inv.token}`}>Link</a>
                              <form action={revokeInviteAction}>
                                <input type="hidden" name="invite_id" value={inv.id} />
                                <Button variant="ghost" size="sm">Revoke</Button>
                              </form>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-muted-foreground">You’re not on any teams yet.</p>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-2">Create a Team</h2>
        {competitions.length ? (
          <form
            action={async (formData) => {
              'use server'
              await createTeam(formData)
            }}
            className="flex flex-col gap-3"
          >
            <Input name="name" placeholder="Team name" required />
            <select
              name="competition_id"
              required
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            >
              {competitions.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            <Button type="submit">Create Team</Button>
          </form>
        ) : (
          <p className="text-muted-foreground">No competitions are open for registration right now.</p>
        )}
      </section>
    </div>
  )
}
