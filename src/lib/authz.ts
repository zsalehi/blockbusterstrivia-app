import "server-only"
import { notFound, redirect } from "next/navigation"
import { query, queryOne } from "./db"
import { getSessionUser, type SessionUser } from "./session"
import { UserError } from "./team-service"

export type OrgRole = "owner" | "manager"
export type OrgMembership = { id: string; name: string; slug: string; role: OrgRole }
export type Viewer = { user: SessionUser; isAdmin: boolean; orgs: OrgMembership[] }

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function loadViewer(user: SessionUser): Promise<Viewer> {
  const profile = await queryOne<{ role: string | null }>(`select role from profiles where id = $1`, [user.id])
  const orgs = await query<OrgMembership>(
    `select o.id, o.name, o.slug, m.role
       from organization_members m join organizations o on o.id = m.organization_id
      where m.user_id = $1 order by o.name`,
    [user.id]
  )
  return { user, isAdmin: profile?.role === "admin", orgs }
}

export async function getViewer(): Promise<Viewer | null> {
  const user = await getSessionUser()
  return user ? loadViewer(user) : null
}

// Pages: send logged-out people to login, and hide the portal from everyone without access.
export async function requireAdminPage(path: string): Promise<Viewer> {
  const viewer = await getViewer()
  if (!viewer) redirect(`/login?next=${encodeURIComponent(path)}`)
  if (!viewer.isAdmin) notFound()
  return viewer
}

export async function requireOrganizerPage(path: string): Promise<Viewer> {
  const viewer = await getViewer()
  if (!viewer) redirect(`/login?next=${encodeURIComponent(path)}`)
  if (!viewer.isAdmin && viewer.orgs.length === 0) notFound()
  return viewer
}

// Services: throw a message that is safe to show.
export async function assertAdmin(user: SessionUser): Promise<Viewer> {
  const viewer = await loadViewer(user)
  if (!viewer.isAdmin) throw new UserError("You don’t have permission to do that.")
  return viewer
}

export function roleIn(viewer: Viewer, orgId: string): OrgRole | null {
  return viewer.orgs.find((o) => o.id === orgId)?.role ?? null
}

// Admins can do anything; owners/managers act within their own organization only.
export async function assertOrgAccess(user: SessionUser, orgId: string, needOwner = false): Promise<Viewer> {
  const viewer = await loadViewer(user)
  if (viewer.isAdmin) return viewer
  const role = roleIn(viewer, orgId)
  if (!role || (needOwner && role !== "owner")) throw new UserError("You don’t have permission to do that.")
  return viewer
}

export async function assertCompetitionAccess(user: SessionUser, competitionId: string, needOwner = false) {
  const comp = UUID_RE.test(competitionId)
    ? await queryOne<{ id: string; organization_id: string | null; title: string }>(
        `select id, organization_id, title from competitions where id = $1`,
        [competitionId]
      )
    : null
  if (!comp) throw new UserError("Competition not found.")
  if (comp.organization_id) await assertOrgAccess(user, comp.organization_id, needOwner)
  else await assertAdmin(user) // competitions with no organization are platform-run
  return comp
}

export async function audit(actor: SessionUser, action: string, target?: string, detail?: string) {
  await query(`insert into audit_log (actor_id, actor_email, action, target, detail) values ($1, $2, $3, $4, $5)`, [
    actor.id,
    actor.email,
    action,
    target ?? null,
    detail ?? null,
  ])
}
