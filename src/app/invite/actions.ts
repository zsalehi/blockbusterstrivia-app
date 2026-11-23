'use server'

import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/session'
import { isUniqueViolation, withTransaction } from '@/lib/db'

type InviteRow = {
  id: string
  team_id: string
  invitee_email: string
  status: string
  expires_at: Date
}

export async function acceptInviteAction(formData: FormData) {
  const token = String(formData.get('token') || '')
  if (!token) throw new Error('Invalid invite link')

  const user = await getSessionUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(`/invite?token=${token}`)}`)

  try {
    await withTransaction(async (db) => {
      const { rows } = await db.query<InviteRow>(
        `select id, team_id, invitee_email, status, expires_at
           from team_invitations where token = $1 for update`,
        [token]
      )
      const invite = rows[0]
      if (!invite) throw new Error('Invite not found')
      if (invite.status !== 'pending' || invite.expires_at < new Date()) {
        throw new Error('Invite is no longer valid')
      }
      if (user.email.toLowerCase() !== invite.invitee_email.toLowerCase()) {
        throw new Error('This invite was sent to a different email address.')
      }

      await db.query(
        `insert into team_members (team_id, user_id, role) values ($1, $2, 'member')`,
        [invite.team_id, user.id]
      )
      await db.query(
        `update team_invitations set status = 'accepted', invitee_user_id = $2 where id = $1`,
        [invite.id, user.id]
      )
    })
  } catch (err) {
    if (isUniqueViolation(err)) throw new Error('You are already on a team for this competition.')
    throw err
  }

  redirect('/teams')
}
