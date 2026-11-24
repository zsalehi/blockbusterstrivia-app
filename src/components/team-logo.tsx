"use client"

import { useState } from "react"

export function TeamLogo({ url, name, className = "size-10" }: { url: string | null; name: string; className?: string }) {
  // Remember which URL failed, so saving a new URL gets a fresh attempt instead of staying on the fallback.
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  if (!url || failedUrl === url) {
    return (
      <span
        aria-hidden
        className={`${className} inline-flex shrink-0 items-center justify-center rounded-lg bg-secondary font-display text-sm font-semibold text-muted-foreground`}
      >
        {name.trim().charAt(0).toUpperCase()}
      </span>
    )
  }
  // eslint-disable-next-line @next/next/no-img-element -- logos are arbitrary captain-supplied URLs
  return <img src={url} alt="" onError={() => setFailedUrl(url)} className={`${className} shrink-0 rounded-lg bg-secondary object-cover`} />
}
