// src/app/competitions/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { query } from '@/lib/db'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Competitions' }
export const dynamic = 'force-dynamic'

type Competition = {
  id: string
  title: string
  description: string | null
  registration_opens: Date | null
  registration_closes: Date | null
  start_at: Date | null
  end_at: Date | null
}

export default async function CompetitionsPage() {
  let competitions: Competition[]
  try {
    competitions = await query<Competition>(
      `select id, title, description, registration_opens, registration_closes, start_at, end_at
         from competitions order by start_at nulls last`
    )
  } catch (error) {
    console.error('Error fetching competitions:', error)
    return <p className="mt-10 text-center text-red-500">Failed to load competitions.</p>
  }

  if (!competitions.length) {
    return (
      <div className="text-center mt-10 space-y-2">
        <h1 className="text-2xl font-bold">Competitions</h1>
        <p className="text-muted-foreground">No competitions available right now.</p>
      </div>
    )
  }

  // ✅ 3. Render list of competitions
  return (
    <div className="max-w-3xl mx-auto mt-10 space-y-8">
      <h1 className="text-3xl font-bold text-center mb-6">Competitions</h1>

      <ul className="space-y-4">
        {competitions.map((comp) => {
          const now = new Date()
          const registrationText =
            comp.registration_opens && comp.registration_closes
              ? now < comp.registration_opens
                ? 'Coming Soon'
                : now <= comp.registration_closes
                ? 'Registration Open'
                : 'Registration Closed'
              : 'Registration Open'

          return (
            <li
              key={comp.id}
              className="border rounded-lg p-5 bg-card shadow-sm hover:shadow-md transition"
            >
              <h2 className="text-xl font-semibold">{comp.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {comp.description || 'No description yet.'}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>
                  <strong>Status:</strong> {registrationText}
                </span>
                {comp.start_at && (
                  <span>
                    <strong>Starts:</strong>{' '}
                    {format(new Date(comp.start_at), 'MMM d, yyyy')}
                  </span>
                )}
                {comp.end_at && (
                  <span>
                    <strong>Ends:</strong>{' '}
                    {format(new Date(comp.end_at), 'MMM d, yyyy')}
                  </span>
                )}
              </div>

              <div className="mt-4">
                <Link href={`/competitions/${comp.id}`}>
                  <Button variant="default">View Details</Button>
                </Link>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
