import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/session'
import { query, queryOne } from '@/lib/db'
import { isRegistrationOpen } from '@/lib/competition'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { RegisterTeamForm } from './register-team-form'

export const metadata: Metadata = { title: 'Register your team' }
export const dynamic = 'force-dynamic'

type Comp = { id: string; title: string; registration_opens: Date | null; registration_closes: Date | null }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function RegisterTeamPage({
  searchParams,
}: {
  searchParams: Promise<{ competition_id?: string }>
}) {
  const { competition_id = '' } = await searchParams
  const here = `/register-team${competition_id ? `?competition_id=${encodeURIComponent(competition_id)}` : ''}`

  const user = await getSessionUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(here)}`)

  const comps = (
    await query<Comp>(
      `select id, title, registration_opens, registration_closes from competitions order by start_at nulls last`
    )
  ).filter((c) => isRegistrationOpen(c))

  const chosen = UUID.test(competition_id) ? comps.find((c) => c.id === competition_id) : undefined

  if (!chosen) {
    return (
      <>
        <PageHeader eyebrow="Register" title="Choose a competition" lead="Pick the division your team will play in." />
        <div className="mx-auto max-w-3xl px-4 py-10">
          {comps.length ? (
            <ul className="space-y-3">
              {comps.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-4 rounded-xl border bg-card p-5">
                  <span className="font-display text-xl font-semibold">{c.title}</span>
                  <Button asChild>
                    <Link href={`/register-team?competition_id=${c.id}`}>Register</Link>
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border bg-card p-6 text-muted-foreground">
              Registration isn’t open for any competition right now. See <Link href="/competitions" className="underline">all competitions</Link>.
            </p>
          )}
        </div>
      </>
    )
  }

  const existing = await queryOne<{ team_id: string }>(
    `select team_id from v_my_teams where user_id = $1 and competition_id = $2`,
    [user.id, chosen.id]
  )
  if (existing) redirect(`/team?id=${existing.team_id}`)

  const profile = await queryOne<{ full_name: string | null; handle: string | null; phone: string | null; date_of_birth: string | null }>(
    `select full_name, handle, phone, to_char(date_of_birth, 'YYYY-MM-DD') as date_of_birth from profiles where id = $1`,
    [user.id]
  )

  return (
    <>
      <PageHeader
        eyebrow={chosen.title}
        title="Register your team"
        lead="You’re the captain. Add your teammates (2 to 4 players in total) and we’ll email each of them an invite to join."
      />
      <div className="mx-auto max-w-3xl px-4 py-10">
        <RegisterTeamForm
          competitionId={chosen.id}
          captain={{
            email: user.email,
            full_name: profile?.full_name ?? '',
            handle: profile?.handle ?? '',
            phone: profile?.phone ?? '',
            date_of_birth: profile?.date_of_birth ?? '',
          }}
        />
      </div>
    </>
  )
}
