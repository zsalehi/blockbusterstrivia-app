// Grant (or revoke) platform-admin access. The person must have logged in once.
//
//   DATABASE_URL=postgres://bbt:<pw>@localhost:5432/bbt node scripts/make-admin.mjs you@example.com
//   DATABASE_URL=... node scripts/make-admin.mjs you@example.com --remove
//
// With docker compose:  docker compose exec -T db psql -U bbt -d bbt -c \
//   "update profiles set role='admin' where id=(select id from \"user\" where lower(email)=lower('you@example.com'))"
import pg from "pg"

const [email, flag] = process.argv.slice(2)
if (!email || !process.env.DATABASE_URL) {
  console.error("Usage: DATABASE_URL=... node scripts/make-admin.mjs <email> [--remove]")
  process.exit(1)
}
const role = flag === "--remove" ? "player" : "admin"
const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()
try {
  const { rows } = await client.query(`select id from "user" where lower(email) = lower($1)`, [email.trim()])
  if (!rows.length) throw new Error(`No account for ${email}. Log in once at the site first, then re-run this.`)
  await client.query(
    `insert into profiles (id, role) values ($1, $2) on conflict (id) do update set role = excluded.role`,
    [rows[0].id, role]
  )
  console.log(`${email} is now: ${role}`)
} catch (err) {
  console.error(err.message)
  process.exitCode = 1
} finally {
  await client.end()
}
