'use server'

import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/session'
import { UserError, acceptInvite } from '@/lib/team-service'

export async function acceptInviteAction(formData: FormData) {
  const token = String(formData.get('token') || '')
  if (!token) redirect('/invite')

  const user = await getSessionUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(`/invite?token=${token}`)}`)

  let teamId: string
  try {
    ;({ teamId } = await acceptInvite(user, token))
  } catch (err) {
    if (err instanceof UserError) {
      redirect(`/invite?token=${encodeURIComponent(token)}&error=${encodeURIComponent(err.message)}`)
    }
    throw err
  }
  redirect(`/team?id=${teamId}`)
}
