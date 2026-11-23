import { getViewer } from '@/lib/authz'

export const dynamic = 'force-dynamic'

// Tells the nav which portal links to show. Authorization is still enforced by each page.
export async function GET() {
  const viewer = await getViewer()
  return Response.json(
    { admin: !!viewer?.isAdmin, organizer: !!viewer && (viewer.isAdmin || viewer.orgs.length > 0) },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
