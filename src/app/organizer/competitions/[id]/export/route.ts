import { getSessionUser } from '@/lib/session'
import { UserError } from '@/lib/team-service'
import { competitionRosterCsv } from '@/lib/portal-service'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user) return new Response('Unauthorized', { status: 401 })
  try {
    const { csv, title } = await competitionRosterCsv(user, id)
    const file = title.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'roster'
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${file}-roster.csv"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    if (err instanceof UserError) return new Response('Not found', { status: 404 })
    throw err
  }
}
