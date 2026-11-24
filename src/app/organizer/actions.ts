'use server'

import { run } from '@/lib/action'
import {
  addOrgMember,
  createCompetition,
  decideAgeException,
  deleteCompetition,
  removeOrgMember,
  removeTeam,
  updateCompetition,
  updateOrganization,
  type CompetitionInput,
  type OrgInput,
} from '@/lib/portal-service'
import type { OrgRole } from '@/lib/authz'

export async function createCompetitionAction(orgId: string, input: CompetitionInput) {
  return run((user) => createCompetition(user, orgId, input))
}

export async function updateCompetitionAction(competitionId: string, input: CompetitionInput) {
  return run(async (user) => {
    await updateCompetition(user, competitionId, input)
    return {}
  })
}

export async function deleteCompetitionAction(competitionId: string) {
  return run(async (user) => {
    await deleteCompetition(user, competitionId)
    return {}
  })
}

export async function removeTeamAction(teamId: string) {
  return run(async (user) => {
    await removeTeam(user, teamId)
    return {}
  })
}

export async function updateOrganizationAction(orgId: string, input: OrgInput) {
  return run(async (user) => {
    await updateOrganization(user, orgId, input)
    return {}
  })
}

export async function addOrgMemberAction(orgId: string, email: string, role: OrgRole) {
  return run(async (user) => {
    await addOrgMember(user, orgId, email, role)
    return {}
  })
}

export async function removeOrgMemberAction(orgId: string, userId: string) {
  return run(async (user) => {
    await removeOrgMember(user, orgId, userId)
    return {}
  })
}

export async function decideAgeExceptionAction(memberId: string, decision: 'approved' | 'denied') {
  return run(async (user) => {
    await decideAgeException(user, memberId, decision)
    return {}
  })
}
