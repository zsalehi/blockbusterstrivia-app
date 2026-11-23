'use server'

import { getSessionUser } from '@/lib/session'
import { UserError, updateProfile } from '@/lib/team-service'

export async function saveProfileAction(
  _prev: { ok: boolean; message: string } | null,
  formData: FormData
): Promise<{ ok: boolean; message: string }> {
  const user = await getSessionUser()
  if (!user) return { ok: false, message: 'Your session has expired. Please log in again.' }
  const get = (k: string) => String(formData.get(k) ?? '')
  try {
    await updateProfile(user, {
      full_name: get('full_name'),
      handle: get('handle'),
      phone: get('phone'),
      date_of_birth: get('date_of_birth'),
    })
    return { ok: true, message: 'Saved.' }
  } catch (err) {
    if (err instanceof UserError) return { ok: false, message: err.message }
    console.error(err)
    return { ok: false, message: 'Something went wrong. Please try again.' }
  }
}
