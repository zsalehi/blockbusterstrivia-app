import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/session'
import { queryOne } from '@/lib/db'
import Link from 'next/link'
import { getViewer } from '@/lib/authz'
import { PageHeader } from '@/components/page-header'
import { ProfileForm } from './profile-form'

export const metadata: Metadata = { title: 'My profile' }
export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const user = await getSessionUser()
  if (!user) redirect('/login?next=%2Fprofile')

  const p = await queryOne<{ full_name: string | null; handle: string | null; phone: string | null; date_of_birth: string | null }>(
    `select full_name, handle, phone, to_char(date_of_birth, 'YYYY-MM-DD') as date_of_birth from profiles where id = $1`,
    [user.id]
  )

  const viewer = await getViewer()
  const portals = [
    ...(viewer?.isAdmin ? [{ href: '/admin', label: 'Admin portal' }] : []),
    ...(viewer?.isAdmin || viewer?.orgs.length ? [{ href: '/organizer', label: 'Organizer portal' }] : []),
  ]

  return (
    <>
      <PageHeader eyebrow="Your account" title="My profile" />
      <div className="mx-auto max-w-lg px-4 py-10">
        {portals.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-3">
            {portals.map((p) => (
              <Link key={p.href} href={p.href} className="rounded-lg border bg-card px-4 py-2 text-sm font-medium hover:border-primary">
                {p.label}
              </Link>
            ))}
          </div>
        )}
        <ProfileForm
          email={user.email}
          values={{
            full_name: p?.full_name ?? '',
            handle: p?.handle ?? '',
            phone: p?.phone ?? '',
            date_of_birth: p?.date_of_birth ?? '',
          }}
        />
      </div>
    </>
  )
}
