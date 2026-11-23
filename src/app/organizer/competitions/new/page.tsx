import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { queryOne } from '@/lib/db'
import { UUID_RE, requireOrganizerPage, roleIn } from '@/lib/authz'
import { CompetitionForm } from '../../organizer-controls'

export const metadata: Metadata = { title: 'New competition' }
export const dynamic = 'force-dynamic'

export default async function NewCompetition({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const { org: orgId = '' } = await searchParams
  const viewer = await requireOrganizerPage(`/organizer/competitions/new?org=${orgId}`)
  const org = UUID_RE.test(orgId) ? await queryOne<{ id: string; name: string }>(`select id, name from organizations where id = $1`, [orgId]) : null
  if (!org || (!viewer.isAdmin && !roleIn(viewer, org.id))) notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="eyebrow"><Link href={`/organizer/orgs/${org.id}`} className="hover:underline">{org.name}</Link></p>
        <h1 className="mt-2 text-3xl font-bold">New competition</h1>
      </div>
      <CompetitionForm orgId={org.id} />
    </div>
  )
}
