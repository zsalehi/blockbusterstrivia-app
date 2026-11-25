// Competition dates are entered and shown in one fixed time zone so the server and
// the browser always agree (and so organizers don't depend on their laptop's zone).
export const APP_TIMEZONE = "America/Toronto"

function parts(date: Date): Record<string, string> {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
  return Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]))
}

const DISPLAY = {
  date: { month: "short", day: "numeric", year: "numeric" }, // Nov 25, 2026
  longDate: { month: "long", day: "numeric", year: "numeric" }, // November 25, 2026
  monthDay: { month: "short", day: "numeric" }, // Nov 25
  dateTime: { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }, // Nov 25, 9:30 p.m.
} satisfies Record<string, Intl.DateTimeFormatOptions>

const displayFormats = Object.fromEntries(
  Object.entries(DISPLAY).map(([k, opts]) => [k, new Intl.DateTimeFormat("en-CA", { ...opts, timeZone: APP_TIMEZONE })])
) as Record<keyof typeof DISPLAY, Intl.DateTimeFormat>

// Human-readable date in APP_TIMEZONE. Server components run in the container's zone (UTC),
// so formatting without an explicit zone would show an evening Toronto start as the next day.
export function formatDate(value: Date | string, style: keyof typeof DISPLAY = "date"): string {
  return displayFormats[style].format(new Date(value))
}

// ISO instant -> "YYYY-MM-DDTHH:mm" in APP_TIMEZONE (the value of a datetime-local input).
export function toLocalInput(value: Date | string | null | undefined): string {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  const p = parts(d)
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`
}

// "YYYY-MM-DDTHH:mm" in APP_TIMEZONE -> ISO instant, or null if empty/invalid.
export function fromLocalInput(value: string | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(value ?? "").trim())
  if (!m) return null
  const [y, mo, d, h, mi] = m.slice(1).map(Number)
  const wall = Date.UTC(y, mo - 1, d, h, mi)
  let guess = wall
  for (let i = 0; i < 2; i++) {
    const p = parts(new Date(guess))
    const shown = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute)
    guess += wall - shown
  }
  return new Date(guess).toISOString()
}
