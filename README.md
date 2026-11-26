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
  For later schema changes add `db/004_*.sql` and run it manually:
  `docker compose exec -T db psql -U bbt -d bbt < db/004_*.sql`
- Update: `git pull && docker compose up -d --build`
- **Public server (VPS):** point DNS A records for the apex and `www` at the server; Caddy gets certificates itself. Open ports 80 and 443 only.
- **Home server:** either forward 80/443 on the router (if the ISP allows it), or use Cloudflare Tunnel:
  set `SITE_ADDRESS=:80` and `TUNNEL_TOKEN`, then `docker compose --profile tunnel up -d`.

Production (blockbusterstrivia.com) runs on SonicInfra behind a shared Caddy: see [docs/sonicinfra.md](docs/sonicinfra.md).
Running it on Unraid: see [docs/unraid.md](docs/unraid.md).

## Admin and organizer portals

- `/admin` (platform admins): overview, organizations, every competition, users and roles, activity log.
- `/organizer` (organization owners and managers): create and edit their own competitions, see rosters, export CSV, remove teams. Owners also manage members.
- Communities are `organizations`; each competition belongs to one. A manager sees only their organization's data, an admin sees everything.
- The first admin: log in once, then `node scripts/make-admin.mjs you@example.com` (in Docker, see docs/unraid.md).
- Rosters and exports include phone numbers and dates of birth; exports and role changes are written to `audit_log`.

## Backups

`scripts/backup.sh` writes a nightly `pg_dump` and copies it offsite with rclone (`RCLONE_REMOTE`).
Cron line and restore command are in the script header. Test a restore once before relying on it.

## Migrating from the old Supabase project

```bash
docker compose run --rm -e SUPABASE_DB_URL='postgresql://postgres.<ref>:<pw>@<pooler-host>:5432/postgres' \
  -v "$PWD/scripts:/app/scripts:ro" app node scripts/import-supabase.mjs
```

Copies users (ids preserved), profiles, competitions, teams, roster rows and invitations.
Reads the source only, runs in one transaction, checks row counts before committing, and is safe to re-run.
Existing invite links (`/invite?token=...`) keep working. Everyone logs in again with a magic link.
The data contains phone numbers and dates of birth (including a Youth division): keep the dump and backups encrypted.

## Layout

- `src/lib/auth.ts`, `auth-client.ts`, `session.ts`: Better Auth config, browser client, server-side `getSessionUser()`
- `src/lib/db.ts`: pg pool and query helpers
- `src/lib/email.ts`: the only place that talks to the email provider
- `src/lib/team-service.ts`: team registration, invites, roster and profile rules; every permission check (captain-only, registration window, one team per competition) lives here because there is no row-level security
- `src/lib/authz.ts`, `portal-service.ts`: who may do what in the admin and organizer portals (organization roles, competition rules, CSV export, audit log)
- `src/app/**/actions.ts`: thin server-action wrappers around the services
- `db/`: SQL schema
