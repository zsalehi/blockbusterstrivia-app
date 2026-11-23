export type RegistrationWindow = {
  registration_opens: Date | string | null
  registration_closes: Date | string | null
}

export function isRegistrationOpen(c: RegistrationWindow, now = new Date()): boolean {
  if (!c.registration_opens || !c.registration_closes) return true
  return new Date(c.registration_opens) <= now && now <= new Date(c.registration_closes)
}
