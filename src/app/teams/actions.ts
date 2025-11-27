'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'


export async function createTeam(formData: FormData) {
  const name = String(formData.get('name') || '').trim()
  const competitionId = String(formData.get('competition_id') || '').trim()

  if (!name) throw new Error('Team name is required')
  if (!competitionId) throw new Error('Competition ID is required')

  const supabase = await createSupabaseServerClient() // 👈 await

  // verify user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) throw new Error('Not authenticated')

  // create the team
  const { data: team, error: teamErr } = await supabase
    .from('teams')
    .insert({
      name,
      competition_id: competitionId,
      captain_user_id: user.id,
      created_by: user.id,
    })
    .select()
    .single()

  if (teamErr) throw new Error(teamErr.message)

  // add creator as captain
  const { error: memberErr } = await supabase
    .from('team_members')
    .insert({
      team_id: team.id,
      user_id: user.id,
      role: 'captain',
    })

  if (memberErr) throw new Error(memberErr.message)

  return team
}
