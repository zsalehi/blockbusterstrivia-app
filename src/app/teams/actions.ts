'use server'

import { run, type ActionResult } from '@/lib/action'
import {
  addRosterMembers,
  cancelInvite,
  registerTeam,
  removeMember,
  resendInvite,
  updateTeamLogo,
  type MemberInput,
} from '@/lib/team-service'

export type { ActionResult }

export async function registerTeamAction(input: { competitionId: string; teamName: string; members: MemberInput[] }) {
  return run((user) => registerTeam(user, input))
}

export async function addMembersAction(teamId: string, members: MemberInput[]) {
  return run((user) => addRosterMembers(user, teamId, members))
}

export async function cancelInviteAction(invitationId: string) {
  return run(async (user) => {
    await cancelInvite(user, invitationId)
    return {}
  })
}

export async function resendInviteAction(invitationId: string) {
  return run((user) => resendInvite(user, invitationId))
}

export async function removeMemberAction(memberId: string) {
  return run(async (user) => {
    await removeMember(user, memberId)
    return {}
  })
}

export async function updateLogoAction(teamId: string, logoUrl: string) {
  return run(async (user) => {
    await updateTeamLogo(user, teamId, logoUrl)
    return {}
  })
}
