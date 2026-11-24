'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import {
  ageStatus,
  checkDob,
  earliestDobFor,
  isMinor,
  checkEmail,
  checkFullName,
  checkHandle,
  checkPhone,
  checkTeamName,
  latestDobFor,
  ymdInAppZone,
  type AgeRule,
} from '@/lib/validation'

type Check = (value: string) => { ok: true; value: string } | { ok: false; error: string }
type InputProps = React.ComponentProps<typeof Input>
type Props = InputProps & {
  check: Check
  // Called on blur with the cleaned-up value (e.g. a formatted phone number). Pass it for
  // controlled inputs; uncontrolled inputs are updated in place.
  onCleanValue?: (value: string) => void
  // Keep blocking submit but don't print the message (when something nearby already explains it).
  hideMessage?: boolean
}

// An Input that runs one of the shared validators. The browser won't submit the form while
// the value is invalid (setCustomValidity), and the message shows under the field after the
// person leaves it. The server repeats the same check, so this is for feedback, not security.
export function CheckedInput({ check, onCleanValue, hideMessage = false, onChange, onBlur, ...props }: Props) {
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function validate(el: HTMLInputElement) {
    const r = check(el.value)
    const message = r.ok ? '' : r.error
    el.setCustomValidity(message)
    setError(message || null)
    return r
  }

  // Controlled inputs re-check on every render, so the message follows rule changes too
  // (e.g. ticking "request an age exception" clears the "too young" message right away).
  const live = props.value !== undefined ? check(String(props.value)) : null
  const shown = live ? (live.ok ? null : live.error) : error

  return (
    <span className="block space-y-1">
      <Input
        {...props}
        aria-invalid={touched && shown ? true : undefined}
        ref={(el) => {
          // Also covers prefilled values the person never touches (e.g. the captain's saved profile).
          if (!el) return
          const r = check(el.value)
          el.setCustomValidity(r.ok ? '' : r.error)
        }}
        onChange={(e) => {
          validate(e.currentTarget)
          onChange?.(e)
        }}
        onBlur={(e) => {
          setTouched(true)
          const r = validate(e.currentTarget)
          if (r.ok && r.value !== e.currentTarget.value) {
            if (onCleanValue) onCleanValue(r.value)
            else e.currentTarget.value = r.value
          }
          onBlur?.(e)
        }}
        onInvalid={() => setTouched(true)}
      />
      {touched && shown && !hideMessage && <span className="block text-xs text-destructive">{shown}</span>}
    </span>
  )
}

type Preset = Omit<Props, 'check'>

export function FullNameInput(props: Preset) {
  return <CheckedInput autoComplete="name" maxLength={80} check={checkFullName} {...props} />
}

export function TeamNameInput(props: Preset) {
  return <CheckedInput maxLength={50} check={checkTeamName} {...props} />
}

export function HandleInput(props: Preset) {
  return <CheckedInput autoCapitalize="none" spellCheck={false} maxLength={31} check={checkHandle} {...props} />
}

export function EmailInput({ required, ...props }: Preset) {
  return (
    <CheckedInput
      type="email"
      inputMode="email"
      autoComplete="email"
      autoCapitalize="none"
      spellCheck={false}
      maxLength={254}
      required={required}
      check={(v) => checkEmail(v, { required: !!required })}
      {...props}
    />
  )
}

export function PhoneInput(props: Preset) {
  return (
    <CheckedInput
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      maxLength={20}
      placeholder="(416) 555-0123"
      check={checkPhone}
      {...props}
    />
  )
}

// Date picker limited to real birth dates. With an age rule the picker only offers dates that
// fit the division, except that a requested min-age exception lifts the "too young" limit.
export function DobInput({ rule, exception = false, required = true, ...props }: Preset & { rule?: AgeRule; exception?: boolean }) {
  const today = ymdInAppZone()
  const oldest = rule?.maxAge ? earliestDobFor(rule.maxAge, rule.onYmd) : latestDobFor(110, today)
  const youngest = rule?.minAge && !exception ? latestDobFor(rule.minAge, rule.onYmd) : today
  return (
    <CheckedInput
      type="date"
      autoComplete="bday"
      required={required}
      min={oldest}
      max={youngest < today ? youngest : today}
      check={(v) => checkDob(v, { required, rule, exception })}
      {...props}
    />
  )
}

export type AgeException = { requested: boolean; reason: string }

// Birth date plus what depends on it: the min-age exception request (only offered when the
// player is too young) and the under-18 waiver reminder.
export function AgeFields({
  rule,
  value,
  onValueChange,
  exception,
  onExceptionChange,
  label = 'Date of birth',
  showLabel = true,
}: {
  rule: AgeRule
  value: string
  onValueChange: (value: string) => void
  exception: AgeException
  onExceptionChange: (e: AgeException) => void
  label?: string
  showLabel?: boolean
}) {
  const valid = checkDob(value, { rule, exception: true }).ok
  const tooYoung = valid && ageStatus(value, rule) === 'too_young'
  const minor = valid && isMinor(value, rule.onYmd)
  return (
    <div className="space-y-1.5">
      {showLabel && <span className="block text-sm font-medium">{label}</span>}
      <DobInput
        rule={rule}
        exception={tooYoung && exception.requested}
        hideMessage={tooYoung}
        aria-label={label}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
      />
      {tooYoung && (
        <div className="space-y-2 rounded-md border border-brand-yellow/40 bg-brand-yellow/5 p-3 text-sm">
          <p>This player is under the minimum age of {rule.minAge} for this competition.</p>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[var(--color-brand-red)]"
              checked={exception.requested}
              onChange={(e) => onExceptionChange({ ...exception, requested: e.target.checked })}
            />
            <span>Request an age exception. An organizer will approve or deny it before the competition.</span>
          </label>
          {exception.requested && (
            <textarea
              required
              maxLength={300}
              rows={2}
              placeholder="Why should this player be allowed to play up?"
              className="border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
              value={exception.reason}
              onChange={(e) => onExceptionChange({ ...exception, reason: e.target.value })}
            />
          )}
        </div>
      )}
      {minor && (
        <p className="text-xs text-muted-foreground">
          Players under 18 need a parent or guardian to agree to the{' '}
          <Link href="/waivers" target="_blank" className="underline">waiver</Link> on their behalf.
        </p>
      )}
    </div>
  )
}

// The value to send to the server: a reason only when the exception box is ticked and still applies.
export function exceptionReasonFor(dob: string, rule: AgeRule, e: AgeException): string {
  return e.requested && ageStatus(dob, rule) === 'too_young' ? e.reason : ''
}
