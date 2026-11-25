// Site-wide navigation. External links open in a new tab so people don't lose their place here.
export type NavLink = { href: string; label: string; external?: boolean }

export const STORE_URL = "https://blockbusters-trivia.square.site/s/shop"

export const MAIN_LINKS: NavLink[] = [
  { href: "/competitions", label: "Competitions" },
  { href: "/schedule", label: "Schedule" },
  { href: STORE_URL, label: "Store", external: true },
]

// Spread onto an <a> or <Link> for external links.
export const externalProps = { target: "_blank", rel: "noopener" } as const
