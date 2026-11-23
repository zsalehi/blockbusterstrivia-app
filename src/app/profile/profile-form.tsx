'use client'

import { useActionState } from 'react'
import { saveProfileAction } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Values = { full_name: string; handle: string; phone: string; date_of_birth: string }

export function ProfileForm({ email, values }: { email: string; values: Values }) {
  const [state, action, pending] = useActionState(saveProfileAction, null)
  const field = 'block space-y-1.5'
  return (
    <form action={action} className="space-y-4">
      <label className={field}>
        <span className="text-sm font-medium">Email</span>
        <Input readOnly value={email} />
      </label>
      <label className={field}>
        <span className="text-sm font-medium">Full name</span>
        <Input name="full_name" defaultValue={values.full_name} maxLength={120} />
      </label>
      <label className={field}>
        <span className="text-sm font-medium">Handle</span>
        <Input name="handle" defaultValue={values.handle} maxLength={60} />
      </label>
      <label className={field}>
        <span className="text-sm font-medium">Phone</span>
        <Input name="phone" type="tel" defaultValue={values.phone} maxLength={40} />
      </label>
      <label className={field}>
        <span className="text-sm font-medium">Date of birth</span>
        <Input name="date_of_birth" type="date" defaultValue={values.date_of_birth} />
      </label>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save changes'}</Button>
        {state && (
          <p role={state.ok ? 'status' : 'alert'} className={`text-sm ${state.ok ? 'text-emerald-400' : 'text-destructive'}`}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  )
}
