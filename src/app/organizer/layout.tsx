import type { Metadata } from 'next'

export const metadata: Metadata = { title: { default: 'Organizer', template: '%s · Organizer' }, robots: { index: false, follow: false } }

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
}
