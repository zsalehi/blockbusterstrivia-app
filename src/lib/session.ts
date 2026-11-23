import "server-only"
import { headers } from "next/headers"
import { auth } from "./auth"

export type SessionUser = { id: string; email: string; name: string }

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user ?? null
}
