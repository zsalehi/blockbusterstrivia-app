# Running BlockBusters on Unraid

Two stages: first prove it works on your home network (no domain, no DNS changes), then decide how to expose it.

## What you need
- Unraid 6.12 or newer, Docker enabled, and SSH on (Settings > Management Access).
- `docker compose version` works over SSH. If not, install **Docker Compose Manager** from Community Applications.
- The Supabase database password (Supabase dashboard > Project Settings > Database).

## Stage 1: run it on the LAN

1. **Copy the code** from your Mac (keeps secrets and build junk out):
   ```bash
   ssh root@192.168.0.4 'mkdir -p /mnt/user/appdata/blockbusterstrivia'
   rsync -av --delete --exclude node_modules --exclude .next --exclude .git --exclude .env --exclude .env.local \
     ./ root@192.168.0.4:/mnt/user/appdata/blockbusterstrivia/
   ```
   (`appdata` should live on the cache pool.)

2. **Create the settings file.** Open a terminal on the server (`ssh root@192.168.0.4`; the prompt then reads `root@Zaigham-Server:~#`), and run these one at a time.

   a. Go to the code and check step 1 worked (you should see `docker-compose.yml`, `Dockerfile`, `db`, `src`):
   ```bash
   cd /mnt/user/appdata/blockbusterstrivia && ls
   ```
   If it says "No such file or directory", step 1 hasn't been run yet; do it from your Mac first.

   b. Paste this whole block. It copies the template to `.env`, generates the two secrets for you, and fills in the settings:
   ```bash
   cp .env.example .env
   sed -i "s|^SITE_URL=.*|SITE_URL=http://192.168.0.4:8480|" .env
   sed -i "s|^BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=$(openssl rand -base64 32)|" .env
   sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 16)|" .env
   sed -i "s|^SITE_ADDRESS=.*|SITE_ADDRESS=:80|" .env
   sed -i "s|^HTTP_PORT=.*|HTTP_PORT=8480|" .env
   sed -i "s|^HTTPS_PORT=.*|HTTPS_PORT=8443|" .env
   sed -i "s|^EMAIL_CONSOLE=.*|EMAIL_CONSOLE=true|" .env
   ```
   It prints nothing when it works. `EMAIL_CONSOLE=true` means login links show up in the app log instead of being emailed (until Resend is set up).

   c. Check it (the two secrets should be filled in; `DATABASE_URL` is unused here, ignore it):
   ```bash
   grep -E "^(SITE_URL|SITE_ADDRESS|HTTP_PORT|HTTPS_PORT|EMAIL_CONSOLE|POSTGRES_PASSWORD|BETTER_AUTH_SECRET)=" .env
   ```
   Keep this file private: it holds your secrets and is never committed or copied back to your Mac.

3. **Start it** (first build takes a few minutes):
   ```bash
   docker compose up -d --build
   docker compose ps          # db, app, caddy should be Up / healthy
   ```
   The database tables are created automatically on this first start.

4. **Open** `http://192.168.0.4:8480`. To log in, enter your email, then fetch the link from the log:
   ```bash
   docker compose logs app | grep -o 'http://[^" <]*magic-link/verify[^" <]*' | tail -1 | sed 's/&amp;/\&/g'
   ```
   Paste that URL into the browser. (Once Resend is set up, the email arrives normally and `EMAIL_CONSOLE` can go.)

5. **Make yourself admin** (after logging in once):
   ```bash
   docker compose run --rm -v "$PWD/scripts:/app/scripts:ro" app node scripts/make-admin.mjs you@example.com
   ```
   Refresh, open your profile, and the Admin portal and Organizer portal links appear.

## Stage 2: import the real data (optional, do last)

Skip this entirely if you are starting fresh with new competitions. It only copies the old Supabase data over.

Supabase's direct host is IPv6-only, so use the **Session pooler** connection string (Supabase dashboard > Connect > Session pooler; it looks like `postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres`).

```bash
cd /mnt/user/appdata/blockbusterstrivia
docker compose run --rm -e SUPABASE_DB_URL='<pooler string>' \
  -v "$PWD/scripts:/app/scripts:ro" app node scripts/import-supabase.mjs
```
It only reads Supabase, runs as one transaction, checks counts before committing, and is safe to re-run.
Expected: about 224 users, 3 competitions, 58 teams, 227 members, 182 invites. Then check `/admin` shows the same numbers.
The 53 roster rows with no account stay unclaimed until those people accept their invite.

## Email (Google Workspace, no extra cost)
Sending uses the Gmail SMTP server signed in with OAuth, so no app password is needed.

1. **Sender alias:** in Admin console add `noreply@blockbusterstrivia.com` as an alias of the sending user, then in that user's Gmail go to Settings > Accounts > Send mail as > Add another email address (tick "Treat as an alias").
2. **Google Cloud project (free, no billing):** console.cloud.google.com > new project. APIs & Services > OAuth consent screen: User type **Internal**, app name BlockBusters, your email. Then Credentials > Create credentials > OAuth client ID > type **Web application**, Authorised redirect URI `https://developers.google.com/oauthplayground`. Copy the client ID and secret.
3. **Get the refresh token:** open developers.google.com/oauthplayground, click the gear, tick "Use your own OAuth credentials", paste the client ID and secret. In Step 1 type `https://mail.google.com/` in the scope box, click Authorize APIs, and sign in **as the sending mailbox**. In Step 2 click "Exchange authorization code for tokens" and copy the refresh token.
4. **Server `.env`:**
   ```
   SMTP_USER=<the sending mailbox, e.g. you@blockbusterstrivia.com>
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REFRESH_TOKEN=...
   EMAIL_FROM=BlockBusters <noreply@blockbusterstrivia.com>
   ```
   Remove `EMAIL_CONSOLE`, leave `SMTP_HOST` and `RESEND_API_KEY` empty, then `docker compose up -d`.
Workspace allows about 2,000 messages per day per user. If the token ever stops working (password reset, admin revoked access), repeat step 3.
(Any other SMTP service also works: set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` instead.)

## Backups (do this before real use)
The data includes phone numbers and dates of birth, including a Youth division.
- Install the **User Scripts** plugin and schedule daily: `cd /mnt/user/appdata/blockbusterstrivia && BACKUP_DIR=/mnt/user/backups/bbt ./scripts/backup.sh`
- Add an encrypted offsite copy: `rclone config` with a **crypt** remote on top of Backblaze B2 (or similar), then set `RCLONE_REMOTE` in `.env`.
- Test a restore once (command is in `scripts/backup.sh`).
- Keep the Postgres data in the Docker volume (it is); do not move it to a user share that spans the array.

## Updating
Re-run the rsync from your Mac, then `docker compose up -d --build`. Schema changes: `db/004_*.sql` etc. are not auto-applied on an existing database; run them with
`docker compose exec -T db psql -U bbt -d bbt < db/004_whatever.sql`.

## About port numbers
Stage 1 is only reachable from inside your home network, so the port is about avoiding clashes (8480 is unlikely to collide with other Unraid containers), not security.
Obscure public ports don't protect anything: scanners find every open port in minutes. What does protect you:
- Postgres is never published to the host (only the app can reach it).
- Public access goes through Cloudflare Tunnel (no open ports at all) or Caddy over HTTPS on 80/443.
- Never forward Unraid's own UI or SSH to the internet.

## Stage 3: going public with Cloudflare Tunnel
No router ports are opened and your home IP stays hidden. We test on `test.blockbusterstrivia.com` first; the Framer site is untouched until you decide to cut over.

**A. Move DNS to Cloudflare (nothing visible changes)**
1. Create a free Cloudflare account, "Add a domain" > `blockbusterstrivia.com` > Free plan.
2. Do not trust the automatic scan. Go to DNS > Records > Import and Export > Import and upload `blockbusterstrivia.com.zone` (exported from the live DNS: Framer A/CNAME, Google MX, SPF, Google DKIM, DMARC, Resend). Check the Framer records (`@` x2 and `www`) show a **grey cloud (DNS only)**, not orange.
3. Cloudflare shows two nameservers. At Namecheap: Domain List > Manage > Nameservers > Custom DNS, enter them, save. Cloudflare emails when it is active (minutes to a few hours).
4. Afterwards verify: the Framer site still loads, an email to info@blockbusterstrivia.com arrives, and a login email from the app still works.

**B. Create the tunnel**
1. Cloudflare dashboard > Zero Trust (it may ask for a card; the free plan is not charged) > Networks > Tunnels > Create a tunnel > Cloudflared. Name it `unraid`.
2. Copy the long token from the install command (the text after `--token`). Treat it like a password.
3. Public Hostname: subdomain `test`, domain `blockbusterstrivia.com`, service type HTTP, URL `caddy:80`. Cloudflare creates the DNS record itself.

**C. Point the app at it** (server `.env`)
```
SITE_URL=https://test.blockbusterstrivia.com
SITE_ADDRESS=:80
TUNNEL_TOKEN=<the token>
ROBOTS_TAG=noindex,nofollow
```
then `docker compose --profile tunnel up -d --build`. While `SITE_URL` is the https address, logging in at `http://192.168.0.4:8480` no longer works (secure cookies); switch `SITE_URL` back if you need the LAN address.

**D. Cutover (later, your decision)** Set `SITE_URL=https://blockbusterstrivia.com` and `ROBOTS_TAG=all`, change the tunnel's public hostname to the root domain (and `www`), delete the Framer A/CNAME records, and redeploy. Keep a note of the Framer records so you can restore them quickly if needed.

Before cutover also: backups running, legal text reviewed, and (optional) remove the old Resend DNS records.
