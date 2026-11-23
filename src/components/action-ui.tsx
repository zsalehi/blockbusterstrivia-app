'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ActionResult } from '@/lib/action'

export function useAction() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  function run<T extends object>(fn: () => Promise<ActionResult<T>>, opts: { done?: string; onOk?: (res: T) => void; refresh?: boolean } = {}) {
    setError(null)
    setDone(null)
    startTransition(async () => {
      const res = await fn()
      if (!res.ok) return setError(res.error)
      if (opts.done) setDone(opts.done)
      opts.onOk?.(res)
      if (opts.refresh !== false) router.refresh()
    })
  }
  return { pending, error, done, run, router }
}

export function Status({ error, done }: { error: string | null; done: string | null }) {
  if (error) return <p role="alert" className="text-sm text-destructive">{error}</p>
  if (done) return <p role="status" className="text-sm text-emerald-400">{done}</p>
  return null
}
