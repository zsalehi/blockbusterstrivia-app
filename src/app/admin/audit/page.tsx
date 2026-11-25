import type { Metadata } from 'next'
import { formatDate } from '@/lib/tz'
import { query } from '@/lib/db'
import { requireAdminPage } from '@/lib/authz'

export const metadata: Metadata = { title: 'Activity log' }
export const dynamic = 'force-dynamic'

export default async function AdminAudit() {
  await requireAdminPage('/admin/audit')
  const rows = await query<{ id: string; actor_email: string | null; action: string; target: string | null; detail: string | null; created_at: Date }>(
    `select id, actor_email, action, target, detail, created_at from audit_log order by created_at desc, id desc limit 200`
  )
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Activity log</h1>
      <p className="text-muted-foreground">Roster exports, role changes and competition edits. The latest 200 entries.</p>
      <div tabIndex={0} role="region" aria-label="Activity log" className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b text-muted-foreground">
            <tr><th scope="col" className="p-3">When</th><th scope="col" className="p-3">Who</th><th scope="col" className="p-3">Action</th><th scope="col" className="p-3">Detail</th></tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap p-3 text-muted-foreground">{formatDate(r.created_at, 'dateTime')}</td>
                <td className="p-3">{r.actor_email ?? '—'}</td>
                <td className="p-3 font-mono text-xs">{r.action}</td>
                <td className="max-w-xs truncate p-3 text-muted-foreground">{r.detail ?? r.target ?? ''}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={4} className="p-4 text-muted-foreground">Nothing yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
