'use client'

import { useEffect, useId, useRef } from 'react'
import { Button } from '@/components/ui/button'

type ButtonProps = React.ComponentProps<typeof Button>

// A button that asks first, in a native modal <dialog> styled like the rest of the site
// (instead of the browser's confirm() box). The browser handles focus trapping, Esc, the
// backdrop and returning focus to the button. Cancel gets initial focus so a stray Enter is safe.
export function ConfirmButton({
  message,
  confirmLabel,
  destructive = true,
  onConfirm,
  children,
  ...props
}: Omit<ButtonProps, 'onClick'> & {
  message: string
  confirmLabel: string
  destructive?: boolean
  onConfirm: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const el = dialog.current
    // Safari has no closedby yet: close on a press and release outside the dialog box.
    if (!el || 'closedBy' in HTMLDialogElement.prototype) return
    const outside = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom
    }
    let pressedOutside = false
    const down = (e: PointerEvent) => { pressedOutside = outside(e) }
    const up = (e: PointerEvent) => { if (pressedOutside && outside(e)) el.close() }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointerup', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointerup', up)
    }
  }, [])

  return (
    <>
      <Button {...props} type="button" onClick={() => dialog.current?.showModal()}>
        {children}
      </Button>
      <dialog
        ref={dialog}
        closedby="any"
        aria-labelledby={titleId}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-border bg-card p-6 text-card-foreground shadow-xl"
        onClose={(e) => {
          const el = e.currentTarget
          // Esc and clicking outside leave returnValue empty; reset it so a stale value can't leak.
          const confirmed = el.returnValue === 'confirm'
          el.returnValue = ''
          if (confirmed) onConfirm()
        }}
      >
        <h1 id={titleId} className="font-sans text-base font-medium">{message}</h1>
        <form method="dialog" className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="submit" value="cancel" variant="outline" autoFocus>
            Cancel
          </Button>
          <Button type="submit" value="confirm" variant={destructive ? 'destructive' : 'default'}>
            {confirmLabel}
          </Button>
        </form>
      </dialog>
    </>
  )
}
