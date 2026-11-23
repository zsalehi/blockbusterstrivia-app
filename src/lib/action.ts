import "server-only"
import { getSessionUser, type SessionUser } from "./session"
import { UserError } from "./team-service"

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string }

// Wraps a server action: requires a session and turns UserError into a result the form can show.
export async function run<T extends object>(fn: (user: SessionUser) => Promise<T>): Promise<ActionResult<T>> {
  const user = await getSessionUser()
  if (!user) return { ok: false, error: "Your session has expired. Please log in again." }
  try {
    return { ok: true, ...(await fn(user)) }
  } catch (err) {
    if (err instanceof UserError) return { ok: false, error: err.message }
    console.error(err)
    return { ok: false, error: "Something went wrong. Please try again." }
  }
}
