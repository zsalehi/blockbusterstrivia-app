# BlockBusters Trivia

Next.js 16 app for blockbusterstrivia.com: marketing site plus team registration and invites.
Self-hosted: Postgres + Better Auth (magic-link login) + Resend (email), served by Caddy.

## Local development

```bash
cp .env.example .env.local        # fill in SITE_URL, BETTER_AUTH_SECRET, DATABASE_URL
docker run -d --name bbt-pg -p 5432:5432 -e POSTGRES_USER=bbt -e POSTGRES_PASSWORD=CHANGE_ME \
  -e POSTGRES_DB=bbt -v "$PWD/db:/docker-entrypoint-initdb.d:ro" postgres:17-alpine
npm install && npm run dev
```

With `RESEND_API_KEY` unset, login and invite emails are printed to the dev server console instead of sent.

## Deploy (any Linux box with Docker: home server or VPS)

```bash
git clone <repo> && cd blockbusterstrivia-app
cp .env.example .env              # set SITE_URL, BETTER_AUTH_SECRET, POSTGRES_PASSWORD, RESEND_API_KEY, SITE_ADDRESS, WWW_ADDRESS
docker compose up -d --build
```

- Schema in `db/*.sql` is applied automatically the first time the database starts (empty volume only).
  For later schema changes add `db/003_*.sql` and run it manually:
  `docker compose exec -T db psql -U bbt -d bbt < db/003_*.sql`
- Update: `git pull && docker compose up -d --build`
- **Public server (VPS):** point DNS A records for the apex and `www` at the server; Caddy gets certificates itself. Open ports 80 and 443 only.
- **Home server:** either forward 80/443 on the router (if the ISP allows it), or use Cloudflare Tunnel:
  set `SITE_ADDRESS=:80` and `TUNNEL_TOKEN`, then `docker compose --profile tunnel up -d`.

## Backups

`scripts/backup.sh` writes a nightly `pg_dump` and copies it offsite with rclone (`RCLONE_REMOTE`).
Cron line and restore command are in the script header. Test a restore once before relying on it.

## Migrating from the old Supabase project

```bash
SUPABASE_DB_URL='postgresql://postgres:<pw>@db.<ref>.supabase.co:5432/postgres' \
DATABASE_URL='postgres://bbt:<pw>@localhost:5432/bbt' \
node scripts/import-supabase.mjs
```

Copies users (ids preserved), competitions, teams, members and invitations. Safe to re-run.
It prints any source columns that have no home in the new schema; add them to `db/002_app.sql` first if you need them.

## Layout

- `src/lib/auth.ts`, `auth-client.ts`, `session.ts`: Better Auth config, browser client, server-side `getSessionUser()`
- `src/lib/db.ts`: pg pool and query helpers
- `src/lib/email.ts`: the only place that talks to the email provider
- `src/app/**/actions.ts`: server actions; permission checks live here (there is no row-level security)
- `db/`: SQL schema
