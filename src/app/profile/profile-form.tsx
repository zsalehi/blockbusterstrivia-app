'use client'

import { useActionState } from 'react'
import { saveProfileAction } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckedInput, DobInput, HandleInput, PhoneInput } from '@/components/checked-input'
import { checkFullName } from '@/lib/validation'

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
        <CheckedInput
          name="full_name"
          autoComplete="name"
          maxLength={80}
          defaultValue={values.full_name}
          check={(v) => (v.trim() ? checkFullName(v) : { ok: true, value: '' })}
        />
      </label>
      <label className={field}>
        <span className="text-sm font-medium">Handle</span>
        <HandleInput name="handle" defaultValue={values.handle} />
      </label>
      <label className={field}>
        <span className="text-sm font-medium">Phone</span>
        <PhoneInput name="phone" defaultValue={values.phone} />
      </label>
      <label className={field}>
        <span className="text-sm font-medium">Date of birth</span>
        <DobInput name="date_of_birth" required={false} defaultValue={values.date_of_birth} />
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
