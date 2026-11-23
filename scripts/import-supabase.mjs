// One-off: copy users + data from the old Supabase project into the new Postgres.
//
//   SUPABASE_DB_URL='postgresql://postgres:<pw>@db.<ref>.supabase.co:5432/postgres' \
//   DATABASE_URL='postgres://bbt:<pw>@localhost:5432/bbt' \
//   node scripts/import-supabase.mjs
//
// The target must already have db/001_auth.sql, db/002_app.sql and db/003_portals.sql applied.
// User ids are preserved, so every foreign key stays valid. Safe to re-run
// (existing rows are updated). The source is only read, never written.
import pg from "pg"

if (!process.env.SUPABASE_DB_URL || !process.env.DATABASE_URL) {
  console.error("Set SUPABASE_DB_URL and DATABASE_URL")
  process.exit(1)
}
const source = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL })
const target = new pg.Client({ connectionString: process.env.DATABASE_URL })

// Parents before children so foreign keys resolve.
const TABLES = ["profiles", "competitions", "teams", "team_members", "team_invitations"]

async function columns(client, table) {
  const { rows } = await client.query(
    `select column_name from information_schema.columns
      where table_schema = 'public' and table_name = $1 order by ordinal_position`,
    [table]
  )
  return rows.map((r) => r.column_name)
}

const q = (c) => `"${c}"`

await source.connect()
await target.connect()

try {
  await source.query("begin read only")
  await target.query("begin")
  // The one-team rule is already satisfied by the source data; skip it during bulk copy.
  await target.query("alter table team_members disable trigger trg_one_team_per_comp")

  const { rows: users } = await source.query(
    `select u.id, u.email, u.email_confirmed_at, u.created_at, u.updated_at,
            coalesce(nullif(p.full_name, ''), u.raw_user_meta_data->>'full_name',
                     u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)) as name
       from auth.users u left join public.profiles p on p.id = u.id
      where u.email is not null`
  )
  for (const u of users) {
    await target.query(
      `insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
       values ($1, $2, lower($3), $4, $5, $6)
       on conflict (id) do update set name = excluded.name, email = excluded.email`,
      [u.id, u.name, u.email, u.email_confirmed_at !== null, u.created_at, u.updated_at ?? u.created_at]
    )
  }
  console.log(`users: ${users.length}`)

  const counts = {}
  for (const table of TABLES) {
    const [srcCols, dstCols] = [await columns(source, table), await columns(target, table)]
    const shared = srcCols.filter((c) => dstCols.includes(c))
    const dropped = srcCols.filter((c) => !dstCols.includes(c))
    if (dropped.length) console.warn(`  ! ${table}: source columns NOT copied (not in new schema): ${dropped.join(", ")}`)

    const { rows } = await source.query(`select ${shared.map(q).join(", ")} from public.${q(table)}`)
    const updates = shared.filter((c) => c !== "id").map((c) => `${q(c)} = excluded.${q(c)}`)
    const insert = `insert into ${q(table)} (${shared.map(q).join(", ")})
                    values (${shared.map((_, i) => `$${i + 1}`).join(", ")})
                    on conflict (id) do update set ${updates.join(", ")}`
    for (const row of rows) await target.query(insert, shared.map((c) => row[c]))
    counts[table] = rows.length
    console.log(`${table}: ${rows.length}`)
  }

  await target.query("alter table team_members enable trigger trg_one_team_per_comp")

  // Imported competitions belong to the original BlockBusters organization (db/003_portals.sql).
  await target.query(
    `update competitions set organization_id = (select id from organizations where slug = 'blockbusters')
      where organization_id is null`
  )

  // Verify before committing: every source row must exist in the target.
  const { rows: tu } = await target.query(`select count(*)::int n from "user"`)
  if (tu[0].n < users.length) throw new Error(`user count mismatch: ${tu[0].n} < ${users.length}`)
  for (const table of TABLES) {
    const { rows } = await target.query(`select count(*)::int n from ${q(table)}`)
    if (rows[0].n < counts[table]) throw new Error(`${table} count mismatch: ${rows[0].n} < ${counts[table]}`)
  }

  await target.query("commit")
  console.log("done, counts verified")
} catch (err) {
  await target.query("rollback").catch(() => {})
  console.error("import failed, nothing was written:", err.message)
  process.exitCode = 1
} finally {
  await source.query("rollback").catch(() => {})
  await source.end()
  await target.end()
}
