import { acceptInviteAction } from './actions'
import { getSessionUser } from '@/lib/session'
import { Button } from '@/components/ui/button'

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token = '' } = await searchParams

  if (!token) return <p className="mt-10 text-center">Invalid invite link.</p>

  const user = await getSessionUser()

  return (
    <div className="max-w-md mx-auto mt-16 space-y-4 text-center px-4">
      <h1 className="text-2xl font-bold">Team Invitation</h1>
      <p className="text-muted-foreground">
        {user ? 'Click accept to join the team.' : 'Log in or sign up to accept this invite.'}
      </p>

      {!user ? (
        <a href={`/login?next=${encodeURIComponent(`/invite?token=${token}`)}`}>
          <Button>Log in to continue</Button>
        </a>
      ) : (
        <form action={acceptInviteAction}>
          <input type="hidden" name="token" value={token} />
          <Button type="submit">Accept Invite</Button>
        </form>
      )}
    </div>
  )
}
