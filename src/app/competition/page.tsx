import { redirect } from 'next/navigation'

// Old Framer URL: /competition?id=<uuid>
export default async function CompetitionRedirect({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams
  redirect(id ? `/competitions/${encodeURIComponent(id)}` : '/competitions')
}
