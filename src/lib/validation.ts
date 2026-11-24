// Input rules for people and teams. Pure functions with no server imports, so the browser
// forms and the server use the exact same checks. The browser checks are only for quick
// feedback; the server always re-runs them, because anyone can send a request without our forms.

import { APP_TIMEZONE } from "./tz"

type Result = { ok: true; value: string } | { ok: false; error: string }
const ok = (value: string): Result => ({ ok: true, value })
const fail = (error: string): Result => ({ ok: false, error })

// ---------- free text ----------

// Control characters, zero-width/bidi characters (used to disguise text) and the BOM.
const INVISIBLE = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g

function tidy(raw: unknown): string {
  return String(raw ?? "").normalize("NFC").replace(INVISIBLE, "").replace(/\s+/g, " ").trim()
}

// Catches links, including bare domains like "free-prizes.com" that email apps turn into links.
const LINK = /(:\/\/|www\.|@|\b[\p{L}\p{N}-]+\.(com|net|org|ca|io|co|me|ly|gg|tv|app|dev|xyz|info|biz|link|site|online|shop|click|top|ru|cn|tk|us|uk)\b)/iu

function looksLikeLink(s: string) {
  return LINK.test(s)
}

// Letters from any language, plus spaces, apostrophes, hyphens and periods ("Mary-Jane O'Neil Jr.").
const PERSON_NAME = /^[\p{L}\p{M}][\p{L}\p{M}'’ .-]*$/u

export function checkFullName(raw: unknown): Result {
  const s = tidy(raw)
  if (!s) return fail("Full name is required.")
  if (s.length > 80) return fail("Full name is too long (80 characters max).")
  if (!PERSON_NAME.test(s)) return fail("Full name can only use letters, spaces, apostrophes, hyphens and periods.")
  return ok(s)
}

// Team names can be playful, but no links and no characters that could be read as markup.
const TEAM_NAME = /^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N} '’&!?,.:()#+-]*$/u

export function checkTeamName(raw: unknown): Result {
  const s = tidy(raw)
  if (!s) return fail("Team name is required.")
  if (s.length > 50) return fail("Team name is too long (50 characters max).")
  if (looksLikeLink(s)) return fail("Team names can’t contain links or web addresses.")
  if (!TEAM_NAME.test(s)) return fail("Team name can use letters, numbers, spaces and simple punctuation (& ! ? , . : ( ) # + - ').")
  return ok(s)
}

const HANDLE = /^[\p{L}\p{N}_.]{2,30}$/u

// Optional. Returns "" when blank.
export function checkHandle(raw: unknown): Result {
  const s = tidy(raw).replace(/^@/, "")
  if (!s) return ok("")
  if (!HANDLE.test(s) || looksLikeLink(s)) return fail("Handle must be 2–30 letters, numbers, underscores or periods.")
  return ok(s)
}

// ---------- email ----------

const EMAIL_LOCAL = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/
const EMAIL_LABEL = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/

// Optional unless `required`. Returns the lowercased address, or "" when blank.
export function checkEmail(raw: unknown, { required = false } = {}): Result {
  const s = String(raw ?? "").replace(INVISIBLE, "").trim().toLowerCase()
  if (!s) return required ? fail("Email is required.") : ok("")
  const bad = fail("Enter a valid email address, like name@example.com.")
  if (s.length > 254) return bad
  const at = s.lastIndexOf("@")
  if (at < 1 || s.indexOf("@") !== at) return bad
  const local = s.slice(0, at)
  const labels = s.slice(at + 1).split(".")
  if (local.length > 64 || !EMAIL_LOCAL.test(local)) return bad
  if (labels.length < 2 || !labels.every((l) => EMAIL_LABEL.test(l))) return bad
  if (!/^[a-z]{2,}$/.test(labels[labels.length - 1])) return bad
  return ok(s)
}

// ---------- phone ----------

// Optional. North American numbers are stored as "(416) 555-0123"; others as "+44 20 7946 0958"
// style digits with a leading +. Returns "" when blank.
export function checkPhone(raw: unknown): Result {
  const s = String(raw ?? "").replace(INVISIBLE, "").trim()
  if (!s) return ok("")
  if (!/^\+?[\d\s().-]+$/.test(s)) return fail("Phone numbers can only contain digits, spaces, +, -, ( and ).")
  const digits = s.replace(/\D/g, "")
  const international = s.startsWith("+") && !digits.startsWith("1")
  if (international) {
    if (digits.length < 8 || digits.length > 15) return fail("Enter a valid international number, like +44 20 7946 0958.")
    return ok(`+${digits}`)
  }
  const nanp = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits
  if (nanp.length !== 10) return fail("Enter a 10-digit phone number, like (416) 555-0123.")
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(nanp)) return fail("That isn’t a real phone number. Check the area code.")
  return ok(`(${nanp.slice(0, 3)}) ${nanp.slice(3, 6)}-${nanp.slice(6)}`)
}

// ---------- dates of birth and ages ----------

const MAX_AGE = 110

// "YYYY-MM-DD" for today (or the given instant) in the app's time zone.
export function ymdInAppZone(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date)
}

function parseYmd(s: string): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return null
  const [y, mo, d] = m.slice(1).map(Number)
  const probe = new Date(Date.UTC(y, mo - 1, d))
  // Rejects dates that don't exist, like 2010-02-30 (JS would quietly roll it into March).
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d) return null
  return [y, mo, d]
}

// Whole years old on `onYmd`. Someone born Feb 29 turns a year older on Mar 1 in non-leap years.
export function ageOn(dobYmd: string, onYmd: string): number {
  const [by, bm, bd] = parseYmd(dobYmd)!
  const [y, m, d] = parseYmd(onYmd)!
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0)
}

// The latest birth date that still meets `minAge` on `onYmd`. Used as the date picker's max.
export function latestDobFor(minAge: number, onYmd: string): string {
  const [y, m, d] = parseYmd(onYmd)!
  const ymd = (day: number) => `${String(y - minAge).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  // Feb 29 minus N years may not exist; Feb 28 is the latest real date that still qualifies.
  return parseYmd(ymd(d)) ? ymd(d) : ymd(d - 1)
}

export type AgeRule = { minAge: number | null; maxAge: number | null; onYmd: string }

// The earliest birth date that is still no older than `maxAge` on `onYmd`. Used as the date picker's min.
export function earliestDobFor(maxAge: number, onYmd: string): string {
  const [y, m, d] = parseYmd(latestDobFor(maxAge + 1, onYmd))!
  const next = new Date(Date.UTC(y, m - 1, d + 1))
  return next.toISOString().slice(0, 10)
}

export function formatYmd(ymd: string): string {
  const [y, m, d] = parseYmd(ymd)!
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-CA", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" })
}

function onWhen(rule: AgeRule) {
  return rule.onYmd === ymdInAppZone() ? "today" : `on ${formatYmd(rule.onYmd)}, when the competition starts`
}

// Where a valid birth date sits against a competition's age rule.
export function ageStatus(dobYmd: string, rule: AgeRule | undefined): "ok" | "too_young" | "too_old" {
  if (!rule || !parseYmd(dobYmd)) return "ok"
  const age = ageOn(dobYmd, rule.onYmd)
  if (rule.maxAge != null && age > rule.maxAge) return "too_old"
  if (rule.minAge != null && age < rule.minAge) return "too_young"
  return "ok"
}

// Under 18 on the competition date (or today): needs a parent or guardian on the waiver.
export function isMinor(dobYmd: string, onYmd: string = ymdInAppZone()): boolean {
  return !!parseYmd(dobYmd) && ageOn(dobYmd, onYmd) < 18
}

export function ageRuleText(rule: AgeRule): string | null {
  const when = `on ${formatYmd(rule.onYmd)}`
  if (rule.minAge && rule.maxAge) return `Players must be ${rule.minAge} to ${rule.maxAge} years old ${when}.`
  if (rule.minAge) return `Players must be at least ${rule.minAge} ${when}.`
  if (rule.maxAge) return `Players must be ${rule.maxAge} or younger ${when}.`
  return null
}

// `exception`: the player is asking an organizer to let them play despite being under min_age.
// There is no exception for max_age: older players can never join a younger division.
export function checkDob(
  raw: unknown,
  { required = true, rule, exception = false }: { required?: boolean; rule?: AgeRule; exception?: boolean } = {}
): Result {
  const s = String(raw ?? "").trim()
  if (!s) return required ? fail("Date of birth is required.") : ok("")
  if (!parseYmd(s)) return fail("Enter a real date of birth.")
  const today = ymdInAppZone()
  if (s > today) return fail("Date of birth can’t be in the future.")
  if (ageOn(s, today) > MAX_AGE) return fail("Check the year of that date of birth.")
  const status = ageStatus(s, rule)
  if (status === "too_old") return fail(`Players must be ${rule!.maxAge} or younger ${onWhen(rule!)}. This division isn’t open to older players.`)
  if (status === "too_young" && !exception) {
    return fail(`Players must be at least ${rule!.minAge} ${onWhen(rule!)}. You can request an age exception for an organizer to review.`)
  }
  return ok(s)
}

// Why a younger player should be allowed to play up. Shown to organizers, so no links.
export function checkExceptionReason(raw: unknown): Result {
  const s = tidy(raw)
  if (!s) return fail("Tell the organizers why this player should be allowed to play up.")
  if (s.length > 300) return fail("Keep the reason under 300 characters.")
  if (looksLikeLink(s) || /[<>]/.test(s)) return fail("The reason can’t contain links or < > characters.")
  return ok(s)
}

// The day ages are measured on: the competition's start date, or today if it has none.
export function ageRuleFor(comp: { min_age: number | null; max_age: number | null; start_at: Date | string | null }): AgeRule {
  return {
    minAge: comp.min_age ?? null,
    maxAge: comp.max_age ?? null,
    onYmd: comp.start_at ? ymdInAppZone(new Date(comp.start_at)) : ymdInAppZone(),
  }
}

// ---------- a roster member ----------

export type MemberFields = {
  full_name?: unknown
  date_of_birth?: unknown
  email?: unknown
  phone?: unknown
  handle?: unknown
  // Non-empty means the captain is requesting a min-age exception for this player.
  age_exception_reason?: unknown
}
export type CleanMemberFields = {
  full_name: string
  date_of_birth: string
  email: string
  phone: string
  handle: string
  // Set only when the player is under min_age and a reason was given.
  age_exception_note: string
}

// Validates every field of one roster entry. Errors are prefixed with `label`.
export function checkMember(
  m: MemberFields,
  label: string,
  rule?: AgeRule
): { ok: true; value: CleanMemberFields } | { ok: false; error: string } {
  const wantsException = !!tidy(m.age_exception_reason)
  const checks = {
    full_name: checkFullName(m.full_name),
    date_of_birth: checkDob(m.date_of_birth, { rule, exception: wantsException }),
    email: checkEmail(m.email),
    phone: checkPhone(m.phone),
    handle: checkHandle(m.handle),
  }
  for (const r of Object.values(checks)) if (!r.ok) return { ok: false, error: `${label}: ${r.error}` }
  const v = (k: keyof typeof checks) => (checks[k] as { value: string }).value

  let age_exception_note = ""
  if (wantsException && ageStatus(v("date_of_birth"), rule) === "too_young") {
    const reason = checkExceptionReason(m.age_exception_reason)
    if (!reason.ok) return { ok: false, error: `${label}: ${reason.error}` }
    age_exception_note = reason.value
  }
  return {
    ok: true,
    value: {
      full_name: v("full_name"),
      date_of_birth: v("date_of_birth"),
      email: v("email"),
      phone: v("phone"),
      handle: v("handle"),
      age_exception_note,
    },
  }
}
