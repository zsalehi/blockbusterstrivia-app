import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PortalTabs } from '@/components/portal-tabs'
import { getViewer } from '@/lib/authz'

export const metadata: Metadata = { title: { default: 'Admin', template: '%s · Admin' }, robots: { index: false, follow: false } }

const TABS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/organizations', label: 'Organizations' },
  { href: '/admin/competitions', label: 'Competitions' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/audit', label: 'Activity log' },
]

// Logged-out visitors fall through to the page, which redirects them to login.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer()
  if (viewer && !viewer.isAdmin) notFound()
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="eyebrow">Platform admin</p>
      <div className="mt-4"><PortalTabs tabs={TABS} /></div>
      <div className="py-8">{children}</div>
    </div>
  )
}
