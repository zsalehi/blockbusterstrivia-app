'use server'

import crypto from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { getSessionUser } from '@/lib/session'
import { isUniqueViolation, query, queryOne, withTransaction } from '@/lib/db'
import { emailLayout, sendEmail } from '@/lib/email'
import { isRegistrationOpen, type RegistrationWindow } from '@/lib/competition'
import { siteUrl } from '@/lib/site-url'

async function requireUser() {
  const user = await getSessionUser()
  if (!user) throw new Error('Not authenticated')
  return user
}

async function requireOpenCompetition(competitionId: string) {
  const comp = await queryOne<RegistrationWindow & { id: string }>(
    `select id, registration_opens, registration_closes from competitions where id = $1`,
    [competitionId]
  )
  if (!comp) throw new Error('Competition not found')
  if (!isRegistrationOpen(comp)) throw new Error('Registration is closed for this competition.')
}

async function requireCaptain(teamId: string, userId: string) {
  const team = await queryOne<{ id: string; competition_id: string; captain_user_id: string }>(
    `select id, competition_id, captain_user_id from teams where id = $1`,
    [teamId]
  )
  if (!team) throw new Error('Team not found')
  if (team.captain_user_id !== userId) throw new Error('Only the team captain can do that.')
  return team
}

export async function createTeam(formData: FormData) {
  const name = String(formData.get('name') || '').trim()
  const competitionId = String(formData.get('competition_id') || '').trim()

  if (!name) throw new Error('Team name is required')
  if (!competitionId) throw new Error('Competition ID is required')

  const user = await requireUser()
  await requireOpenCompetition(competitionId)

  try {
    const team = await withTransaction(async (db) => {
      const { rows } = await db.query<{ id: string; name: string }>(
        `insert into teams (name, competition_id, captain_user_id, created_by)
         values ($1, $2, $3, $3) returning id, name`,
        [name, competitionId, user.id]
      )
      await db.query(
        `insert into team_members (team_id, user_id, role) values ($1, $2, 'captain')`,
        [rows[0].id, user.id]
      )
      return rows[0]
    })
    revalidatePath('/teams')
    return team
  } catch (err) {
    if (isUniqueViolation(err)) throw new Error('You are already on a team for this competition.')
    throw err
  }
}

export async function joinTeam(formData: FormData) {
  const teamId = String(formData.get('team_id') || '').trim()
  if (!teamId) throw new Error('Team id required')

  const user = await requireUser()

  const team = await queryOne<{ competition_id: string }>(
    `select competition_id from teams where id = $1`,
    [teamId]
  )
  if (!team) throw new Error('Team not found')
  await requireOpenCompetition(team.competition_id)

  try {
    await query(`insert into team_members (team_id, user_id, role) values ($1, $2, 'member')`, [
      teamId,
      user.id,
    ])
  } catch (err) {
    if (isUniqueViolation(err)) throw new Error('You are already on a team for this competition.')
    throw err
  }

  revalidatePath('/teams')
}

export async function inviteToTeam(formData: FormData) {
  const teamId = String(formData.get('team_id') || '').trim()
  const email = String(formData.get('email') || '').trim().toLowerCase()

  if (!teamId) throw new Error('Team id required')
  if (!email) throw new Error('Email is required')

  const user = await requireUser()
  const team = await requireCaptain(teamId, user.id)

  const token = crypto.randomBytes(32).toString('base64url')

  try {
    await query(
      `insert into team_invitations (team_id, competition_id, inviter_user_id, invitee_email, role, token)
       values ($1, $2, $3, $4, 'member', $5)`,
      [teamId, team.competition_id, user.id, email, token]
    )
  } catch (err) {
    if (isUniqueViolation(err)) throw new Error('An invite is already pending for this email.')
    throw err
  }

  try {
    await sendEmail({
      to: email,
      subject: 'You’re invited to join a BlockBusters team',
      html: emailLayout(
        'BlockBusters Trivia',
        'You’ve been invited to join a team.',
        'Accept Invite',
        `${siteUrl}/invite?token=${token}`
      ),
    })
  } catch (err) {
    await query(`delete from team_invitations where token = $1`, [token])
    throw err
  }

  revalidatePath('/teams')
}

export async function revokeInviteAction(formData: FormData) {
  const id = String(formData.get('invite_id') || '')
  if (!id) throw new Error('Invite id required')

  const user = await requireUser()

  const invite = await queryOne<{ team_id: string }>(
    `select team_id from team_invitations where id = $1`,
    [id]
  )
  if (!invite) throw new Error('Invite not found')
  await requireCaptain(invite.team_id, user.id)

  await query(`update team_invitations set status = 'revoked' where id = $1 and status = 'pending'`, [id])
  revalidatePath('/teams')
}
