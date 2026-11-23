// One-off: copy users + data from the old Supabase project into the new Postgres.
//
//   SUPABASE_DB_URL='postgresql://postgres:<pw>@db.<ref>.supabase.co:5432/postgres' \
//   DATABASE_URL='postgres://bbt:<pw>@localhost:5432/bbt' \
//   node scripts/import-supabase.mjs
//
// The target must already have db/001_auth.sql and db/002_app.sql applied.
// User ids are preserved, so every foreign key stays valid. Safe to re-run.
import pg from "pg"

const source = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL })
const target = new pg.Client({ connectionString: process.env.DATABASE_URL })
if (!process.env.SUPABASE_DB_URL || !process.env.DATABASE_URL) {
  console.error("Set SUPABASE_DB_URL and DATABASE_URL")
  process.exit(1)
}

const TABLES = ["competitions", "teams", "team_members", "team_invitations"]

async function columns(client, table) {
  const { rows } = await client.query(
    `select column_name from information_schema.columns
      where table_schema = 'public' and table_name = $1 order by ordinal_position`,
    [table]
  )
  return rows.map((r) => r.column_name)
}

await source.connect()
await target.connect()

try {
  await target.query("begin")
  await target.query("alter table team_members disable trigger team_members_one_team_per_competition")

  const { rows: users } = await source.query(
    `select id, email, email_confirmed_at, created_at, updated_at,
            coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)) as name
       from auth.users where email is not null`
  )
  for (const u of users) {
    await target.query(
      `insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
       values ($1, $2, lower($3), $4, $5, $6) on conflict do nothing`,
      [u.id, u.name, u.email, u.email_confirmed_at !== null, u.created_at, u.updated_at ?? u.created_at]
    )
  }
  console.log(`users: ${users.length}`)

  for (const table of TABLES) {
    const [srcCols, dstCols] = [await columns(source, table), await columns(target, table)]
    const shared = srcCols.filter((c) => dstCols.includes(c))
    const dropped = srcCols.filter((c) => !dstCols.includes(c))
    if (dropped.length) console.warn(`  ! ${table}: source columns NOT copied (not in new schema): ${dropped.join(", ")}`)

    const { rows } = await source.query(`select ${shared.map((c) => `"${c}"`).join(", ")} from public."${table}"`)
    const insert = `insert into "${table}" (${shared.map((c) => `"${c}"`).join(", ")})
                    values (${shared.map((_, i) => `$${i + 1}`).join(", ")}) on conflict do nothing`
    for (const row of rows) await target.query(insert, shared.map((c) => row[c]))
    console.log(`${table}: ${rows.length}`)
  }

  await target.query("alter table team_members enable trigger team_members_one_team_per_competition")
  await target.query("commit")
  console.log("done")
} catch (err) {
  await target.query("rollback").catch(() => {})
  console.error("import failed, nothing was written:", err.message)
  process.exitCode = 1
} finally {
  await source.end()
  await target.end()
}
