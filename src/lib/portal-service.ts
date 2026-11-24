import "server-only"
import { revalidatePath } from "next/cache"
import { isUniqueViolation, query, queryOne, withTransaction } from "./db"
import {
  assertAdmin,
  assertCompetitionAccess,
  assertOrgAccess,
  audit,
  UUID_RE,
  type OrgRole,
} from "./authz"
import { UserError } from "./team-service"
import type { SessionUser } from "./session"

const norm = (e: unknown) => String(e ?? "").trim().toLowerCase()
const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v)

function revalidatePublic() {
  revalidatePath("/competitions")
  revalidatePath("/teams")
}

// ---------- organizations ----------

export type OrgInput = { name?: string; slug?: string; description?: string; ownerEmail?: string }

function cleanOrg(input: OrgInput) {
  const name = String(input.name ?? "").trim().slice(0, 100)
  if (!name) throw new UserError("Give the organization a name.")
  const slug = String(input.slug ?? "").trim().toLowerCase()
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 60) {
    throw new UserError("The short name can only use lowercase letters, numbers and dashes.")
  }
  const description = String(input.description ?? "").trim().slice(0, 500) || null
  return { name, slug, description }
}

async function userIdByEmail(email: string): Promise<string> {
  const row = await queryOne<{ id: string }>(`select id from "user" where lower(email) = $1`, [email])
  if (!row) {
    throw new UserError(`There’s no account for ${email} yet. Ask them to log in once at /login, then add them here.`)
  }
  return row.id
}

export async function createOrganization(actor: SessionUser, input: OrgInput) {
  await assertAdmin(actor)
  const org = cleanOrg(input)
  const ownerEmail = norm(input.ownerEmail)
  const ownerId = ownerEmail ? await userIdByEmail(ownerEmail) : null
  try {
    const id = await withTransaction(async (c) => {
      const { rows } = await c.query<{ id: string }>(
        `insert into organizations (name, slug, description) values ($1, $2, $3) returning id`,
        [org.name, org.slug, org.description]
      )
      if (ownerId) {
        await c.query(`insert into organization_members (organization_id, user_id, role) values ($1, $2, 'owner')`, [
          rows[0].id,
          ownerId,
        ])
      }
      return rows[0].id
    })
    await audit(actor, "organization.create", org.slug, ownerEmail || undefined)
    return { id }
  } catch (err) {
    if (isUniqueViolation(err)) throw new UserError("That short name is already taken.")
    throw err
  }
}

export async function updateOrganization(actor: SessionUser, orgId: string, input: OrgInput) {
  if (!isUuid(orgId)) throw new UserError("Organization not found.")
  await assertOrgAccess(actor, orgId, true)
  const org = cleanOrg(input)
  try {
    const res = await query(`update organizations set name = $2, slug = $3, description = $4 where id = $1 returning id`, [
      orgId,
      org.name,
      org.slug,
      org.description,
    ])
    if (!res.length) throw new UserError("Organization not found.")
  } catch (err) {
    if (isUniqueViolation(err)) throw new UserError("That short name is already taken.")
    throw err
  }
  await audit(actor, "organization.update", org.slug)
}

export async function deleteOrganization(actor: SessionUser, orgId: string) {
  await assertAdmin(actor)
  if (!isUuid(orgId)) throw new UserError("Organization not found.")
  const org = await queryOne<{ slug: string; n: number }>(
    `select o.slug, (select count(*)::int from competitions c where c.organization_id = o.id) as n
       from organizations o where o.id = $1`,
    [orgId]
  )
  if (!org) throw new UserError("Organization not found.")
  if (org.n > 0) throw new UserError("This organization still has competitions. Delete or move them first.")
  await query(`delete from organizations where id = $1`, [orgId])
  await audit(actor, "organization.delete", org.slug)
}

export async function addOrgMember(actor: SessionUser, orgId: string, email: string, role: OrgRole) {
  if (!isUuid(orgId)) throw new UserError("Organization not found.")
  if (role !== "owner" && role !== "manager") throw new UserError("Choose a role.")
  await assertOrgAccess(actor, orgId, true)
  const e = norm(email)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new UserError("Enter a valid email address.")
  const userId = await userIdByEmail(e)
  await query(
    `insert into organization_members (organization_id, user_id, role) values ($1, $2, $3)
     on conflict (organization_id, user_id) do update set role = excluded.role`,
    [orgId, userId, role]
  )
  await audit(actor, "organization.member_set", orgId, `${e} as ${role}`)
}

export async function removeOrgMember(actor: SessionUser, orgId: string, userId: string) {
  if (!isUuid(orgId) || !isUuid(userId)) throw new UserError("Member not found.")
  await assertOrgAccess(actor, orgId, true)
  await withTransaction(async (c) => {
    // Serialise membership changes so two owners can't remove each other at once.
    await c.query(`select 1 from organizations where id = $1 for update`, [orgId])
    const { rows } = await c.query<{ user_id: string; role: string }>(
      `select user_id, role from organization_members where organization_id = $1`,
      [orgId]
    )
    const target = rows.find((r) => r.user_id === userId)
    if (!target) throw new UserError("That person isn’t a member.")
    if (target.role === "owner" && rows.filter((r) => r.role === "owner").length === 1) {
      throw new UserError("An organization needs at least one owner.")
    }
    await c.query(`delete from organization_members where organization_id = $1 and user_id = $2`, [orgId, userId])
  })
  await audit(actor, "organization.member_remove", orgId, userId)
}

// ---------- platform users ----------

export async function setPlatformRole(actor: SessionUser, userId: string, role: "admin" | "player") {
  await assertAdmin(actor)
  if (!isUuid(userId)) throw new UserError("User not found.")
  if (role !== "admin" && role !== "player") throw new UserError("Choose a role.")
  if (userId === actor.id) throw new UserError("You can’t change your own role.")
  const res = await query<{ id: string }>(`update profiles set role = $2 where id = $1 returning id`, [userId, role])
  if (!res.length) throw new UserError("User not found.")
  await audit(actor, "user.set_role", userId, role)
}

// ---------- competitions ----------

export const STATUSES = ["upcoming", "active", "complete"] as const
export const FORMATS = ["single_elim", "double_elim", "groups", "swiss", "custom"] as const

export type CompetitionInput = {
  title?: string
  description?: string
  status?: string
  format?: string
  max_teams?: string
  min_age?: string
  max_age?: string
  registration_opens?: string | null
  registration_closes?: string | null
  start_at?: string | null
  end_at?: string | null
}

function cleanDate(label: string, v: string | null | undefined): Date | null {
  if (!v) return null
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) throw new UserError(`${label} isn’t a valid date.`)
  return d
}

function cleanAge(label: string, raw: string | undefined): number | null {
  const s = String(raw ?? "").trim()
  if (!s) return null
  const n = Number(s)
  if (!Number.isInteger(n) || n < 1 || n > 99) throw new UserError(`${label} must be a whole number between 1 and 99, or left blank for no limit.`)
  return n
}

function cleanCompetition(input: CompetitionInput) {
  const title = String(input.title ?? "").trim().slice(0, 150)
  if (!title) throw new UserError("Give the competition a title.")
  const description = String(input.description ?? "").trim().slice(0, 4000) || null
  const status = String(input.status ?? "upcoming")
  if (!(STATUSES as readonly string[]).includes(status)) throw new UserError("Choose a valid status.")
  const format = String(input.format ?? "single_elim")
  if (!(FORMATS as readonly string[]).includes(format)) throw new UserError("Choose a valid format.")

  const rawMax = String(input.max_teams ?? "").trim()
  let max_teams: number | null = null
  if (rawMax) {
    max_teams = Number(rawMax)
    if (!Number.isInteger(max_teams) || max_teams < 1 || max_teams > 1000) {
      throw new UserError("Maximum teams must be a whole number between 1 and 1000, or left blank for no limit.")
    }
  }

  const min_age = cleanAge("Minimum age", input.min_age)
  const max_age = cleanAge("Maximum age", input.max_age)
  if (min_age !== null && max_age !== null && min_age > max_age) throw new UserError("Minimum age can’t be higher than maximum age.")

  const registration_opens = cleanDate("Registration opens", input.registration_opens)
  const registration_closes = cleanDate("Registration closes", input.registration_closes)
  const start_at = cleanDate("Start date", input.start_at)
  const end_at = cleanDate("End date", input.end_at)
  if (!!registration_opens !== !!registration_closes) {
    throw new UserError("Set both registration dates, or leave both blank for always-open registration.")
  }
  if (registration_opens && registration_closes && registration_closes <= registration_opens) {
    throw new UserError("Registration must close after it opens.")
  }
  if (start_at && end_at && end_at < start_at) throw new UserError("The end date must be after the start date.")

  return { title, description, status, format, max_teams, min_age, max_age, registration_opens, registration_closes, start_at, end_at }
}

const COMP_COLS = `title, description, status, format, max_teams, min_age, max_age, registration_opens, registration_closes, start_at, end_at`

export async function createCompetition(actor: SessionUser, orgId: string, input: CompetitionInput) {
  if (!isUuid(orgId)) throw new UserError("Choose an organization.")
  await assertOrgAccess(actor, orgId)
  const c = cleanCompetition(input)
  const row = await queryOne<{ id: string }>(
    `insert into competitions (organization_id, created_by, ${COMP_COLS})
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) returning id`,
    [orgId, actor.id, c.title, c.description, c.status, c.format, c.max_teams, c.min_age, c.max_age, c.registration_opens, c.registration_closes, c.start_at, c.end_at]
  )
  await audit(actor, "competition.create", row!.id, c.title)
  revalidatePublic()
  return { id: row!.id }
}

export async function updateCompetition(actor: SessionUser, competitionId: string, input: CompetitionInput) {
  await assertCompetitionAccess(actor, competitionId)
  const c = cleanCompetition(input)
  if (c.max_teams !== null) {
    const { n } = (await queryOne<{ n: number }>(`select count(*)::int n from teams where competition_id = $1`, [competitionId]))!
    if (c.max_teams < n) throw new UserError(`${n} teams are already registered, so the limit can’t be lower than ${n}.`)
  }
  await query(
    `update competitions set title = $2, description = $3, status = $4, format = $5, max_teams = $6,
            registration_opens = $7, registration_closes = $8, start_at = $9, end_at = $10, min_age = $11, max_age = $12
      where id = $1`,
    [competitionId, c.title, c.description, c.status, c.format, c.max_teams, c.registration_opens, c.registration_closes, c.start_at, c.end_at, c.min_age, c.max_age]
  )
  await audit(actor, "competition.update", competitionId, c.title)
  revalidatePublic()
  revalidatePath(`/competitions/${competitionId}`)
}

export async function deleteCompetition(actor: SessionUser, competitionId: string) {
  const comp = await assertCompetitionAccess(actor, competitionId, true)
  const { n } = (await queryOne<{ n: number }>(`select count(*)::int n from teams where competition_id = $1`, [competitionId]))!
  if (n > 0) throw new UserError("This competition has registered teams. Remove them first, or set it to complete instead.")
  await query(`delete from competitions where id = $1`, [competitionId])
  await audit(actor, "competition.delete", competitionId, comp.title)
  revalidatePublic()
}

// Withdraw a team (and its roster and invites) from a competition.
export async function removeTeam(actor: SessionUser, teamId: string) {
  if (!isUuid(teamId)) throw new UserError("Team not found.")
  const team = await queryOne<{ id: string; name: string; competition_id: string }>(
    `select id, name, competition_id from teams where id = $1`,
    [teamId]
  )
  if (!team) throw new UserError("Team not found.")
  await assertCompetitionAccess(actor, team.competition_id)
  await query(`delete from teams where id = $1`, [teamId])
  await audit(actor, "team.remove", team.competition_id, team.name)
  revalidatePublic()
  revalidatePath(`/competitions/${team.competition_id}`)
}

// Approve or deny a player's request to play under the competition's minimum age.
export async function decideAgeException(actor: SessionUser, memberId: string, decision: "approved" | "denied") {
  if (!isUuid(memberId)) throw new UserError("Player not found.")
  if (decision !== "approved" && decision !== "denied") throw new UserError("Choose approve or deny.")
  const m = await queryOne<{ full_name: string; age_exception: string | null; competition_id: string; team_name: string }>(
    `select tm.full_name, tm.age_exception, t.competition_id, t.name as team_name
       from team_members tm join teams t on t.id = tm.team_id where tm.id = $1`,
    [memberId]
  )
  if (!m || !m.age_exception) throw new UserError("That player has no age exception request.")
  await assertCompetitionAccess(actor, m.competition_id)
  await query(
    `update team_members set age_exception = $2, age_exception_decided_by = $3, age_exception_decided_at = now() where id = $1`,
    [memberId, decision, actor.id]
  )
  await audit(actor, `age_exception.${decision === "approved" ? "approve" : "deny"}`, m.competition_id, `${m.full_name} (${m.team_name})`)
  revalidatePath(`/organizer/competitions/${m.competition_id}`)
  revalidatePath("/team")
}

// ---------- reads for the portals ----------

export type RosterRow = {
  team_id: string
  team_name: string
  logo_url: string | null
  member_id: string
  full_name: string
  role: string
  member_email: string | null
  phone: string | null
  date_of_birth: string | null
  age: number | null
  joined: boolean
  invite_status: string | null
  age_exception: "requested" | "approved" | "denied" | null
  age_exception_note: string | null
}

// Full roster with contact details. Callers must have passed assertCompetitionAccess first.
export async function competitionRoster(competitionId: string): Promise<RosterRow[]> {
  return query<RosterRow>(
    `select t.id as team_id, t.name as team_name, t.logo_url,
            tm.id as member_id, tm.full_name, tm.role, tm.member_email, tm.phone,
            to_char(tm.date_of_birth, 'YYYY-MM-DD') as date_of_birth,
            case when tm.date_of_birth is not null
                 then extract(year from age(current_date, tm.date_of_birth))::int end as age,
            (tm.user_id is not null) as joined, tm.age_exception, tm.age_exception_note,
            (select i.status from team_invitations i where i.team_member_id = tm.id
              order by i.created_at desc limit 1) as invite_status
       from teams t
       left join team_members tm on tm.team_id = t.id
      where t.competition_id = $1
      order by t.name, (tm.role = 'captain') desc, tm.full_name`,
    [competitionId]
  )
}

function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? "" : String(v)
  // Stop spreadsheet apps from treating user-entered text as a formula.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function competitionRosterCsv(actor: SessionUser, competitionId: string): Promise<{ csv: string; title: string }> {
  const comp = await assertCompetitionAccess(actor, competitionId)
  const rows = await competitionRoster(competitionId)
  const header = ["Team", "Name", "Role", "Email", "Phone", "Date of birth", "Age", "Account", "Invite", "Age exception", "Exception reason"]
  const lines = [header, ...rows.filter((r) => r.member_id).map((r) => [
    r.team_name,
    r.full_name,
    r.role,
    r.member_email,
    r.phone,
    r.date_of_birth,
    r.age,
    r.joined ? "joined" : "not yet",
    r.invite_status ?? "",
    r.age_exception ?? "",
    r.age_exception_note ?? "",
  ])]
  await audit(actor, "roster.export", competitionId, comp.title)
  return { csv: lines.map((l) => l.map(csvCell).join(",")).join("\r\n") + "\r\n", title: comp.title }
}
