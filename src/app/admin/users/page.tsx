import type { Metadata } from 'next'
import { query } from '@/lib/db'
import { requireAdminPage } from '@/lib/authz'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RoleButton } from '../admin-controls'

export const metadata: Metadata = { title: 'Users' }
export const dynamic = 'force-dynamic'

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams
  const viewer = await requireAdminPage('/admin/users')
  const term = q.trim().slice(0, 100)
  const users = await query<{ id: string; email: string; name: string; role: string | null; created_at: Date; orgs: string | null }>(
    `select u.id, u.email, u.name, p.role, u."createdAt" as created_at,
            (select string_agg(o.name || ' (' || m.role || ')', ', ') from organization_members m
               join organizations o on o.id = m.organization_id where m.user_id = u.id) as orgs
       from "user" u left join profiles p on p.id = u.id
      where $1 = '' or u.email ilike '%' || $1 || '%' or u.name ilike '%' || $1 || '%' or p.full_name ilike '%' || $1 || '%'
      order by (p.role = 'admin') desc, u."createdAt" desc
      limit 100`,
    [term.replace(/[\\%_]/g, '\\$&')]
  )
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Users</h1>
      <form className="flex max-w-md gap-2" role="search">
        <Input name="q" defaultValue={term} placeholder="Search name or email" aria-label="Search users" />
        <Button type="submit" variant="outline">Search</Button>
      </form>
      <ul className="divide-y rounded-xl border bg-card">
        {users.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <p className="truncate font-medium">
                {u.name} {u.role === 'admin' && <span className="ml-1 rounded bg-primary/15 px-1.5 py-0.5 text-xs text-primary">admin</span>}
              </p>
              <p className="truncate text-sm text-muted-foreground">{u.email} · joined {format(u.created_at, 'MMM d, yyyy')}</p>
              {u.orgs && <p className="text-xs text-muted-foreground">{u.orgs}</p>}
            </div>
            {u.id !== viewer.user.id && <RoleButton userId={u.id} name={u.name} isAdmin={u.role === 'admin'} />}
          </li>
        ))}
        {!users.length && <li className="p-4 text-muted-foreground">No users match.</li>}
      </ul>
      <p className="text-xs text-muted-foreground">Showing up to 100 users.</p>
    </div>
  )
}
