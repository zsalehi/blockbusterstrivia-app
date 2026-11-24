import "server-only"
import crypto from "node:crypto"
import type { PoolClient } from "pg"
import { revalidatePath } from "next/cache"
import { isUniqueViolation, query, queryOne, withTransaction } from "./db"
import { emailLayout, emailShell, escapeHtml, sendEmail, sendEmailsPaced } from "./email"
import { isRegistrationOpen } from "./competition"
import { siteUrl } from "./site-url"
import type { SessionUser } from "./session"
import { ageRuleFor, checkDob, checkFullName, checkHandle, checkMember, checkPhone, checkTeamName, type AgeRule } from "./validation"

export const MIN_TEAM_SIZE = 2
export const MAX_TEAM_SIZE = 4
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

// A message that is safe to show the person who triggered the action.
export class UserError extends Error {}

export type MemberInput = {
  role?: string
  full_name?: string
  date_of_birth?: string
  email?: string
  handle?: string
  phone?: string
  age_exception_reason?: string
}

type CleanMember = {
  role: "captain" | "member"
  full_name: string
  date_of_birth: string
  email: string
  handle: string
  phone: string
  age_exception_note: string
}

const normalizeEmail = (e: unknown) => String(e ?? "").trim().toLowerCase()

function newToken() {
  return crypto.randomBytes(24).toString("hex")
}

function cleanMember(m: MemberInput, label: string, role: "captain" | "member", rule: AgeRule): CleanMember {
  const r = checkMember(m, label, rule)
  if (!r.ok) throw new UserError(r.error)
  return { role, ...r.value }
}

async function competitionAgeRule(competitionId: string, db?: PoolClient): Promise<AgeRule> {
  type Row = { min_age: number | null; max_age: number | null; start_at: Date | null }
  const sql = `select min_age, max_age, start_at from competitions where id = $1`
  const row = db ? (await db.query<Row>(sql, [competitionId])).rows[0] : await queryOne<Row>(sql, [competitionId])
  if (!row) throw new UserError("Competition not found.")
  return ageRuleFor(row)
}

function assertNoDuplicateEmails(members: CleanMember[]) {
  const seen = new Set<string>()
  for (const m of members) {
    if (!m.email) continue
    if (seen.has(m.email)) throw new UserError(`${m.email} is listed more than once.`)
    seen.add(m.email)
  }
}

function inviteEmail(teamName: string, inviterEmail: string, token: string, heading = "You’re invited to join a team") {
  return {
    subject: `You’re invited to join ${teamName}`,
    html: emailLayout(
      heading,
      `${inviterEmail || "A team captain"} invited you to join “${teamName}” at BlockBusters Trivia.`,
      "Accept invite",
      `${siteUrl}/invite?token=${token}`,
      { note: "You’ll be asked to log in with this email address. If you weren’t expecting this invite, you can ignore it." }
    ),
  }
}

async function loadCaptainTeam(teamId: string, userId: string, db?: PoolClient) {
  const run = db ? async (t: string, p: unknown[]) => (await db.query(t, p)).rows : query
  const team = (await run(
    `select id, name, competition_id, captain_user_id from teams where id = $1 ${db ? "for update" : ""}`,
    [teamId]
  ))[0] as { id: string; name: string; competition_id: string; captain_user_id: string | null } | undefined
  if (!team) throw new UserError("Team not found.")
  if (team.captain_user_id !== userId) throw new UserError("Only the team captain can do that.")
  return team
}

async function insertInvites(
  db: PoolClient,
  team: { id: string; competition_id: string },
  inviterId: string,
  targets: { team_member_id: string; email: string }[]
) {
  if (!targets.length) return []
  const { rows: pending } = await db.query<{ invitee_email: string }>(
    `select invitee_email from team_invitations where team_id = $1 and status = 'pending'`,
    [team.id]
  )
  const pendingSet = new Set(pending.map((p) => normalizeEmail(p.invitee_email)))
  const created: { invitee_email: string; token: string }[] = []
  for (const t of targets.filter((x) => !pendingSet.has(x.email))) {
    const { rows } = await db.query<{ invitee_email: string; token: string }>(
      `insert into team_invitations
         (team_id, competition_id, inviter_user_id, invitee_email, role, token, status, expires_at, team_member_id)
       values ($1, $2, $3, $4, 'member', $5, 'pending', $6, $7)
       returning invitee_email, token`,
      [team.id, team.competition_id, inviterId, t.email, newToken(), new Date(Date.now() + INVITE_TTL_MS), t.team_member_id]
    )
    created.push(rows[0])
  }
  return created
}

export async function registerTeam(
  user: SessionUser,
  input: { competitionId: string; teamName: string; members: MemberInput[] }
): Promise<{ teamId: string; invitesCount: number }> {
  const name = checkTeamName(input.teamName)
  if (!name.ok) throw new UserError(name.error)
  const teamName = name.value
  if (!Array.isArray(input.members)) throw new UserError("Add your team members.")
  if (input.members.length < MIN_TEAM_SIZE) throw new UserError(`A team needs at least ${MIN_TEAM_SIZE} members.`)
  if (input.members.length > MAX_TEAM_SIZE) throw new UserError(`A team can have at most ${MAX_TEAM_SIZE} members.`)

  const captainCount = input.members.filter((m) => m.role === "captain").length
  if (captainCount !== 1) throw new UserError("A team needs exactly one captain.")

  const comp = await queryOne<{
    id: string
    title: string
    start_at: Date | null
    end_at: Date | null
    max_teams: number | null
    min_age: number | null
    max_age: number | null
    registration_opens: Date | null
    registration_closes: Date | null
  }>(
    `select id, title, start_at, end_at, max_teams, min_age, max_age, registration_opens, registration_closes
       from competitions where id = $1`,
    [input.competitionId]
  )
  if (!comp) throw new UserError("Competition not found.")
  if (!isRegistrationOpen(comp)) throw new UserError("Registration is closed for this competition.")

  const rule = ageRuleFor(comp)
  let mateNo = 0
  const members = input.members.map((m) =>
    m.role === "captain" ? cleanMember(m, "You (captain)", "captain", rule) : cleanMember(m, `Teammate ${++mateNo}`, "member", rule)
  )
  // The captain's own email is their login, never what the form sent.
  members.find((m) => m.role === "captain")!.email = normalizeEmail(user.email)
  assertNoDuplicateEmails(members)

  let result: { teamId: string; invites: { invitee_email: string; token: string }[]; teamName: string }
  try {
    result = await withTransaction(async (db) => {
      await db.query(`select pg_advisory_xact_lock(hashtext($1))`, [`register:${comp.id}`])
      if (comp.max_teams !== null) {
        const { rows } = await db.query<{ n: string }>(`select count(*) n from teams where competition_id = $1`, [comp.id])
        if (Number(rows[0].n) >= comp.max_teams) throw new UserError("This competition is full.")
      }
      const { rows: teamRows } = await db.query<{ id: string; name: string }>(
        `insert into teams (name, competition_id, captain_user_id, created_by)
         values ($1, $2, $3, $3) returning id, name`,
        [teamName, comp.id, user.id]
      )
      const team = { id: teamRows[0].id, competition_id: comp.id }

      const targets: { team_member_id: string; email: string }[] = []
      for (const m of members) {
        const isCaptain = m.role === "captain"
        const { rows } = await db.query<{ id: string }>(
          `insert into team_members (team_id, user_id, role, full_name, date_of_birth, handle, phone, member_email, age_exception, age_exception_note)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning id`,
          [team.id, isCaptain ? user.id : null, m.role, m.full_name, m.date_of_birth, m.handle || null, m.phone || null, m.email || null,
           m.age_exception_note ? "requested" : null, m.age_exception_note || null]
        )
        if (!isCaptain && m.email) targets.push({ team_member_id: rows[0].id, email: m.email })
      }
      const invites = await insertInvites(db, team, user.id, targets)
      return { teamId: team.id, invites, teamName: teamRows[0].name }
    })
  } catch (err) {
    if (isUniqueViolation(err)) {
      const constraint = (err as { constraint?: string }).constraint
      if (constraint === "teams_competition_id_name_key") {
        throw new UserError("A team with that name is already registered in this competition.")
      }
      throw new UserError("You’re already registered on a team for this competition.")
    }
    throw err
  }

  await sendEmailsPaced(
    result.invites.map((inv) => ({ to: inv.invitee_email, ...inviteEmail(result.teamName, normalizeEmail(user.email), inv.token) }))
  )
  await notifyAdmins({ teamId: result.teamId, teamName: result.teamName, comp, captainEmail: user.email, members })

  return { teamId: result.teamId, invitesCount: result.invites.length }
}

function ageFrom(dob: string) {
  const d = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--
  return age >= 0 ? String(age) : ""
}

async function notifyAdmins(opts: {
  teamId: string
  teamName: string
  comp: { id: string; title: string; start_at: Date | null; end_at: Date | null }
  captainEmail: string
  members: CleanMember[]
}) {
  const to = (process.env.REGISTRATION_NOTIFY_TO ?? "info@blockbusterstrivia.com")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  const rows = opts.members
    .map((m) => {
      const line = [m.email, m.phone, m.date_of_birth ? `age ${ageFrom(m.date_of_birth)}` : ""].filter(Boolean).map(escapeHtml).join(" &middot; ")
      return `<tr><td style="padding:10px 0;border-top:1px solid #e3e7ed;font-size:15px">
        <b>${escapeHtml(m.full_name)}</b> <span style="color:#5b6b7c">&mdash; ${escapeHtml(m.role)}${m.handle ? ", @" + escapeHtml(m.handle) : ""}</span><br>
        <span style="color:#5b6b7c;font-size:14px">${line}</span>${
          m.age_exception_note
            ? `<br><span style="color:#b4462f;font-size:14px"><b>Age exception requested:</b> ${escapeHtml(m.age_exception_note)}</span>`
            : ""
        }</td></tr>`
    })
    .join("")
  const link = `${siteUrl}/team?id=${opts.teamId}`
  const exceptions = opts.members.filter((m) => m.age_exception_note).length
  const review = `${siteUrl}/organizer/competitions/${opts.comp.id}`
  const html = emailShell({
    heading: "New team registration",
    preheader: `${opts.teamName} registered for ${opts.comp.title}`,
    footer: "Sent to the registration notification list. This email contains player contact details; please don’t forward it.",
    content: `
      <p style="margin:0 0 20px"><b>Team:</b> ${escapeHtml(opts.teamName)}<br>
        <b>Competition:</b> ${escapeHtml(opts.comp.title)}<br>
        <b>Captain:</b> ${escapeHtml(opts.captainEmail)}<br>
        <a href="${escapeHtml(link)}" style="color:#3481b5">View team</a></p>
      ${exceptions ? `<p style="margin:0 0 20px;color:#b4462f"><b>${exceptions} age exception request${exceptions > 1 ? "s" : ""} to review.</b> <a href="${escapeHtml(review)}" style="color:#3481b5">Approve or deny in the organizer portal</a></p>` : ""}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`,
  })
  await sendEmailsPaced(to.map((addr) => ({ to: addr, subject: `${exceptions ? "[Age exception] " : ""}New team registration: ${opts.teamName} (${opts.comp.title})`, html })))
}

export async function addRosterMembers(
  user: SessionUser,
  teamId: string,
  input: MemberInput[]
): Promise<{ added: number; invitesCount: number }> {
  if (!Array.isArray(input) || !input.length) throw new UserError("Add at least one member.")
  if (input.length > MAX_TEAM_SIZE) throw new UserError(`A team can have at most ${MAX_TEAM_SIZE} members.`)

  const { team, invites, members } = await withTransaction(async (db) => {
    const team = await loadCaptainTeam(teamId, user.id, db)
    const rule = await competitionAgeRule(team.competition_id, db)
    const members = input.map((m, i) => cleanMember(m, input.length > 1 ? `Teammate ${i + 1}` : "Teammate", "member", rule))
    assertNoDuplicateEmails(members)
    const { rows: countRows } = await db.query<{ n: string }>(`select count(*) n from team_members where team_id = $1`, [team.id])
    const remaining = Math.max(0, MAX_TEAM_SIZE - Number(countRows[0].n))
    if (remaining === 0) throw new UserError(`Team is already full (max ${MAX_TEAM_SIZE}).`)
    if (members.length > remaining) throw new UserError(`Only ${remaining} slot(s) left on this team.`)

    const emails = members.map((m) => m.email).filter(Boolean)
    if (emails.length) {
      const { rows } = await db.query(
        `select 1 from team_members where team_id = $1 and lower(member_email) = any($2) limit 1`,
        [team.id, emails]
      )
      if (rows.length) throw new UserError("One or more of those emails are already on this team’s roster.")
    }

    const targets: { team_member_id: string; email: string }[] = []
    for (const m of members) {
      const { rows } = await db.query<{ id: string }>(
        `insert into team_members (team_id, user_id, role, full_name, date_of_birth, handle, phone, member_email, age_exception, age_exception_note)
         values ($1, null, 'member', $2, $3, $4, $5, $6, $7, $8) returning id`,
        [team.id, m.full_name, m.date_of_birth, m.handle || null, m.phone || null, m.email || null,
         m.age_exception_note ? "requested" : null, m.age_exception_note || null]
      )
      if (m.email) targets.push({ team_member_id: rows[0].id, email: m.email })
    }
    return { team, members, invites: await insertInvites(db, team, user.id, targets) }
  })

  await sendEmailsPaced(
    invites.map((inv) => ({ to: inv.invitee_email, ...inviteEmail(team.name, normalizeEmail(user.email), inv.token) }))
  )
  revalidateTeamPaths()
  return { added: members.length, invitesCount: invites.length }
}

export async function acceptInvite(user: SessionUser, token: string): Promise<{ teamId: string }> {
  const outcome = await withTransaction(async (db): Promise<{ teamId: string } | { error: string }> => {
    const { rows } = await db.query<{
      id: string
      team_id: string
      competition_id: string
      invitee_email: string
      status: string
      expires_at: Date
      team_member_id: string | null
    }>(
      `select id, team_id, competition_id, invitee_email, status, expires_at, team_member_id
         from team_invitations where token = $1 for update`,
      [token]
    )
    const inv = rows[0]
    if (!inv) return { error: "Invite not found." }
    if (inv.status !== "pending") return { error: `This invite is no longer valid (it was ${inv.status}).` }
    if (inv.expires_at.getTime() < Date.now()) {
      await db.query(`update team_invitations set status = 'expired' where id = $1`, [inv.id])
      return { error: "This invite has expired. Ask your captain to send a new one." }
    }

    const inviteTo = normalizeEmail(inv.invitee_email)
    const me = normalizeEmail(user.email)
    if (inviteTo && inviteTo !== me) {
      return { error: `This invite was sent to ${inviteTo}, but you’re signed in as ${me}. Sign in with the invited email.` }
    }

    const { rows: existing } = await db.query(
      `select tm.team_id from team_members tm join teams t on t.id = tm.team_id
        where tm.user_id = $1 and t.competition_id = $2 limit 1`,
      [user.id, inv.competition_id]
    )
    if (existing.length) return { error: "You’re already registered on a team for this competition." }

    // Claim the roster slot this invite was created for, falling back to an email match.
    let slot: { id: string; user_id: string | null } | undefined
    if (inv.team_member_id) {
      slot = (await db.query<{ id: string; user_id: string | null }>(
        `select id, user_id from team_members where id = $1 and team_id = $2 for update`,
        [inv.team_member_id, inv.team_id]
      )).rows[0]
    }
    if (!slot && inviteTo) {
      slot = (await db.query<{ id: string; user_id: string | null }>(
        `select id, user_id from team_members
          where team_id = $1 and lower(member_email) = $2
          order by created_at limit 1 for update`,
        [inv.team_id, inviteTo]
      )).rows[0]
    }

    if (slot) {
      if (slot.user_id && slot.user_id !== user.id) return { error: "That roster spot has already been claimed by another account." }
      if (!slot.user_id) await db.query(`update team_members set user_id = $1 where id = $2`, [user.id, slot.id])
    } else {
      const { rows: sizeRows } = await db.query<{ n: string }>(`select count(*) n from team_members where team_id = $1`, [inv.team_id])
      if (Number(sizeRows[0].n) >= MAX_TEAM_SIZE) return { error: "This team is already full." }
      const profile = await db.query<{ full_name: string | null }>(`select full_name from profiles where id = $1`, [user.id])
      const fullName = profile.rows[0]?.full_name || user.name || me.split("@")[0]
      await db.query(
        `insert into team_members (team_id, user_id, role, full_name, member_email) values ($1, $2, 'member', $3, $4)`,
        [inv.team_id, user.id, fullName, me]
      )
    }

    await db.query(`update team_invitations set status = 'accepted', invitee_user_id = $2 where id = $1`, [inv.id, user.id])
    return { teamId: inv.team_id }
  }).catch((err) => {
    if (isUniqueViolation(err)) return { error: "You’re already registered on a team for this competition." }
    throw err
  })

  if ("error" in outcome) throw new UserError(outcome.error)
  revalidateTeamPaths()
  return outcome
}

export async function cancelInvite(user: SessionUser, invitationId: string): Promise<void> {
  const inv = await queryOne<{ id: string; status: string; team_id: string; team_member_id: string | null }>(
    `select id, status, team_id, team_member_id from team_invitations where id = $1`,
    [invitationId]
  )
  if (!inv) throw new UserError("Invite not found.")
  if (inv.status !== "pending") throw new UserError("Only pending invites can be cancelled.")
  await loadCaptainTeam(inv.team_id, user.id)

  await withTransaction(async (db) => {
    await db.query(`update team_invitations set status = 'revoked' where id = $1`, [inv.id])
    if (inv.team_member_id) {
      // Free the slot's email so a different address can be invited, but only while nobody has claimed it.
      await db.query(`update team_members set member_email = null where id = $1 and user_id is null`, [inv.team_member_id])
    }
  })
  revalidateTeamPaths()
}

export async function resendInvite(user: SessionUser, invitationId: string): Promise<{ reopened: boolean }> {
  const inv = await queryOne<{ id: string; token: string; status: string; invitee_email: string; team_id: string }>(
    `select id, token, status, invitee_email, team_id from team_invitations where id = $1`,
    [invitationId]
  )
  if (!inv) throw new UserError("Invite not found.")
  const team = await loadCaptainTeam(inv.team_id, user.id)

  if (!["pending", "revoked", "expired"].includes(inv.status)) {
    throw new UserError(`This invite can’t be resent (it was ${inv.status}).`)
  }

  // A revoked or expired invite is reopened with a fresh token, which kills the old link.
  const reopened = inv.status !== "pending"
  let token = inv.token
  if (reopened) {
    token = newToken()
    await query(
      `update team_invitations set status = 'pending', token = $2, expires_at = $3, created_at = now() where id = $1`,
      [inv.id, token, new Date(Date.now() + INVITE_TTL_MS)]
    )
  }

  try {
    await sendEmail({
      to: inv.invitee_email,
      ...inviteEmail(team.name, "", token, reopened ? "You’re invited again" : "Reminder: you’re invited"),
    })
  } catch (err) {
    console.error("resend invite failed:", err instanceof Error ? err.message : err)
    throw new UserError("The email couldn’t be sent. Please try again in a moment.")
  }
  revalidateTeamPaths()
  return { reopened }
}

export async function removeMember(user: SessionUser, memberId: string): Promise<void> {
  const tm = await queryOne<{ id: string; role: string; team_id: string }>(
    `select id, role, team_id from team_members where id = $1`,
    [memberId]
  )
  if (!tm) throw new UserError("Team member not found.")
  await loadCaptainTeam(tm.team_id, user.id)
  if (tm.role === "captain") throw new UserError("The captain can’t be removed from the roster.")

  await withTransaction(async (db) => {
    await db.query(`update team_invitations set status = 'revoked' where team_member_id = $1 and status = 'pending'`, [tm.id])
    await db.query(`delete from team_members where id = $1`, [tm.id])
  })
  revalidateTeamPaths()
}

export async function updateTeamLogo(user: SessionUser, teamId: string, logoUrl: string): Promise<void> {
  const url = logoUrl.trim()
  let parsed: URL | null = null
  try {
    parsed = new URL(url)
  } catch {}
  if (!parsed || !["http:", "https:"].includes(parsed.protocol) || url.length > 500) {
    throw new UserError("Enter a full image address starting with https://")
  }
  await loadCaptainTeam(teamId, user.id)
  await query(`update teams set logo_url = $2 where id = $1`, [teamId, url])
  revalidateTeamPaths()
}

export async function updateProfile(
  user: SessionUser,
  input: { full_name: string; handle: string; phone: string; date_of_birth: string }
): Promise<void> {
  // Everything on the profile is optional, but whatever is filled in must be valid.
  const checks = {
    full_name: String(input.full_name ?? "").trim() ? checkFullName(input.full_name) : ({ ok: true, value: "" } as const),
    handle: checkHandle(input.handle),
    phone: checkPhone(input.phone),
    dob: checkDob(input.date_of_birth, { required: false }),
  }
  for (const r of Object.values(checks)) if (!r.ok) throw new UserError(r.error)
  const v = (k: keyof typeof checks) => (checks[k] as { value: string }).value
  const [full_name, handle, phone, dob] = [v("full_name"), v("handle"), v("phone"), v("dob")]
  try {
    await query(
      `insert into profiles (id, full_name, handle, phone, date_of_birth)
       values ($1, $2, $3, $4, $5)
       on conflict (id) do update
         set full_name = $2, handle = $3, phone = $4, date_of_birth = $5`,
      [user.id, full_name || null, handle || null, phone || null, dob || null]
    )
  } catch (err) {
    if (isUniqueViolation(err)) throw new UserError("That handle is already taken.")
    throw err
  }
}

function revalidateTeamPaths() {
  revalidatePath("/team")
  revalidatePath("/teams")
}
