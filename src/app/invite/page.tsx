import type { Metadata } from 'next'
import Link from 'next/link'
import { acceptInviteAction } from './actions'
import { getSessionUser } from '@/lib/session'
import { queryOne } from '@/lib/db'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Team invitation' }
export const dynamic = 'force-dynamic'

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>
}) {
  const { token = '', error } = await searchParams

  const invite = token
    ? await queryOne<{ status: string; not_expired: boolean; team_name: string; competition_title: string; invitee_email: string }>(
        `select i.status, (i.expires_at > now()) as not_expired, i.invitee_email, t.name as team_name, c.title as competition_title
           from team_invitations i
           join teams t on t.id = i.team_id
           join competitions c on c.id = i.competition_id
          where i.token = $1`,
        [token]
      )
    : null

  const user = invite ? await getSessionUser() : null
  const usable = invite?.status === 'pending' && invite.not_expired

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="eyebrow">Team invitation</p>
      {!invite ? (
        <>
          <h1 className="mt-3 text-3xl font-bold">Invite not found</h1>
          <p className="mt-3 text-muted-foreground">This link isn’t valid. Ask your captain to send a new invite.</p>
        </>
      ) : !usable ? (
        <>
          <h1 className="mt-3 text-3xl font-bold">This invite is no longer valid</h1>
          <p className="mt-3 text-muted-foreground">
            It was {invite.status === 'pending' ? 'sent more than 7 days ago' : invite.status}. Ask your captain to resend it.
          </p>
        </>
      ) : (
        <>
          <h1 className="mt-3 text-3xl font-bold text-balance">Join {invite.team_name}</h1>
          <p className="mt-3 text-muted-foreground">{invite.competition_title}</p>

          {error && (
            <p role="alert" className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
              {error}
            </p>
          )}

          <div className="mt-8">
            {!user ? (
              <>
                <p className="mb-4 text-sm text-muted-foreground">
                  Log in with <span className="font-medium text-foreground">{invite.invitee_email}</span> to accept.
                </p>
                <Button size="lg" asChild>
                  <Link href={`/login?next=${encodeURIComponent(`/invite?token=${token}`)}`}>Log in to continue</Link>
                </Button>
              </>
            ) : (
              <form action={acceptInviteAction}>
                <input type="hidden" name="token" value={token} />
                <p className="mb-4 text-sm text-muted-foreground">
                  Signed in as <span className="font-medium text-foreground">{user.email}</span>
                </p>
                <Button type="submit" size="lg">Accept invite</Button>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  )
}
