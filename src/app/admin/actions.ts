'use server'

import { run } from '@/lib/action'
import {
  createOrganization,
  deleteOrganization,
  setPlatformRole,
  type OrgInput,
} from '@/lib/portal-service'

export async function createOrganizationAction(input: OrgInput) {
  return run((user) => createOrganization(user, input))
}

export async function deleteOrganizationAction(orgId: string) {
  return run(async (user) => {
    await deleteOrganization(user, orgId)
    return {}
  })
}

export async function setPlatformRoleAction(userId: string, role: 'admin' | 'player') {
  return run(async (user) => {
    await setPlatformRole(user, userId, role)
    return {}
  })
}
