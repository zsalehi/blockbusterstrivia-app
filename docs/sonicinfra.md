# Running on SonicInfra

Production runs on a SonicInfra Compute Instance behind one shared Caddy, so the same
server can host more sites and apps.

```
Internet → L4 load balancer apps-lb (65.19.176.194, TCP 80→80, 443→443, selects label role=apps)
         → instance apps-01 (ne.2, Ubuntu 26.04, label role=apps)
             /srv/edge                    shared Caddy: HTTPS for every domain, routes by hostname
             /srv/blockbusterstrivia-app  git clone of this repo: Postgres + Next.js app
                                          (alias bbt-app on the edge network)
```

Instances have no public IP of their own; the load balancer sends traffic to anything labelled
`role=apps`. Load balancers can't be edited, only deleted and recreated (which changes the IP).

## Deploying

Push to `main`. That's it:

```
git push origin main
  → GitHub Actions (.github/workflows/deploy.yml, on GitHub's own runner)
      installs `sonic`, logs in with the SONIC_MACHINE_TOKEN secret,
      SSHes to apps-01.sonicinfra with the DEPLOY_SSH_KEY secret
  → apps-01: that key may only run scripts/deploy.sh, which
      git fetch + reset --hard origin/main, docker compose up -d --build, waits for healthy
```

Watch it in the repo's **Actions** tab or with `gh run watch <run id>`. A failed health check fails
the run and prints the app's last log lines; the previous version keeps running until the new
container starts. Redeploy without a code change: **Run workflow** on the Deploy workflow, or
`gh workflow run Deploy`.

Rules that follow from this:
- **Never edit code on the server.** `deploy.sh` runs `git reset --hard origin/main`, which discards
  any change to tracked files. Untracked and ignored files (`.env`, `src/fonts/`, `backups/`) are
  never touched.
- **Roll back with `git revert <commit>` and push.** The pipeline deploys the revert like any change.
- **Schema changes are not applied automatically.** After the deploy that adds `db/005_*.sql`:
  `ssh zsalehi313@apps-01.sonicinfra 'cd /srv/blockbusterstrivia-app && docker compose exec -T db psql -U bbt -d bbt < db/005_whatever.sql'`
- **The Homestead font is not in git** (personal-use licence, repo is public). The server keeps its own
  copy in `src/fonts/`, which is why the build runs there and not on GitHub.

### Why it is built this way
- The repo is public, so there is no self-hosted runner on the server: a pull request from a fork must
  never be able to run code on it. GitHub never passes secrets to workflows from forks, and the
  workflow only triggers on pushes to `main`.
- The deploy key is restricted in `~/.ssh/authorized_keys2` on the server:
  `command="/srv/blockbusterstrivia-app/scripts/deploy.sh",no-port-forwarding,no-agent-forwarding,no-X11-forwarding,no-pty ssh-ed25519 … github-actions-deploy`.
  Whatever the client asks to run, sshd runs only `deploy.sh`. A leaked key can only redeploy.
- `deploy.sh` keeps all its work inside `main()` because `git reset` rewrites the script while bash is
  still reading it; bash has parsed the whole function before anything runs.

### Secrets and their upkeep

| GitHub secret | What | Source |
|---|---|---|
| `SONIC_MACHINE_TOKEN` | Sonic CLI login for CI. **Expires about 2027-02-24** (90 days from 2026-11-26) | `sonic machine-token request --days 90` |
| `DEPLOY_SSH_KEY` | Private half of the deploy key (`~/.ssh/bbt-deploy` on the Mac) | `ssh-keygen -t ed25519 -f ~/.ssh/bbt-deploy -N "" -C github-actions-deploy` |
| `DEPLOY_KNOWN_HOSTS` | apps-01's SSH host keys, so the runner can't be fooled by an impostor | `ssh-keygen -F apps-01.sonicinfra \| grep -v '^#'` |

Renew the token before it expires (an expired token fails the "Log in to SonicInfra" step; the
site keeps running the last version):

```bash
sonic machine-token request --days 90
gh secret set SONIC_MACHINE_TOKEN
```

If the instance is ever recreated, its host keys change: update `DEPLOY_KNOWN_HOSTS` (connect once
from the Mac first) and put the deploy key back in `authorized_keys2`.

### Deploying by hand

When GitHub Actions is down, run the same deploy from the Mac with the deploy key:

```bash
ssh -i ~/.ssh/bbt-deploy -o IdentitiesOnly=yes zsalehi313@apps-01.sonicinfra
```

`IdentitiesOnly=yes` matters: without it ssh offers your personal key first, which logs you into a
normal shell instead of running the deploy.

## SSH keys on the server: don't touch `authorized_keys`

SonicInfra's guest agent rewrites `~/.ssh/authorized_keys` about every 5 minutes with only the keys
Sonic knows (the GitHub import from instance creation, plus anything added with `sonic ssh-copy-id`),
and writes it without a trailing newline. Hand edits are wiped, and `cat >> authorized_keys` glues
onto the last key and locks everyone out.

- Personal keys: `sonic ssh-copy-id apps-01` or the dashboard's SSH Keys page.
- Extra or restricted keys (the deploy key): `~/.ssh/authorized_keys2`, which sshd also reads.
- Locked out: `sonic ssh-copy-id apps-01` still works, because it goes through the guest agent, not SSH.

## Storage

Everything that matters lives on the `apps-data` volume (30Gi), not the instance's 8 GB root disk:

```
/data              volume apps-data, mounted by label via /etc/fstab (nofail)
├── docker/        Docker's data-root (/etc/docker/daemon.json): images, Postgres data, Caddy certificates
└── srv/           app folders and their .env files; /srv is a symlink to it
```

`/etc/systemd/system/docker.service.d/data-volume.conf` has `RequiresMountsFor=/data`, so Docker
won't start without the volume (it would otherwise come up with an empty database).

The volume is not a backup: it faithfully keeps a deleted or corrupted database. See Backups.

### Rebuilding the server

1. Create a new instance with label `role=apps`, the `apps-data` volume attached and SSH key
   `gh:zsalehi`. The load balancer picks it up by label.
2. On it: add `LABEL=apps-data /data ext4 defaults,nofail 0 2` to `/etc/fstab` and `mount /data`;
   recreate `/etc/docker/daemon.json` (`{ "data-root": "/data/docker" }`), the systemd drop-in above
   and the symlink `/srv → /data/srv`; then `apt install docker.io docker-compose-v2 docker-buildx`
   and `usermod -aG docker $USER`.
3. The app folders, `.env` files, font and database come back with the volume. Start everything:
   `docker compose up -d` in `/srv/edge`, then in each app folder.
4. Put the deploy key in `~/.ssh/authorized_keys2`, update the `DEPLOY_KNOWN_HOSTS` secret, and
   reinstall the backup cron line.

Starting from an empty volume instead: `git clone https://github.com/zsalehi/blockbusterstrivia-app.git /srv/blockbusterstrivia-app`,
copy `src/fonts/Homestead-Regular.ttf` from the Mac with `scp`, write `.env` (see `docs/unraid.md` for
the keys), `docker network create edge`, copy `deploy/edge/` to `/srv/edge`, and restore the latest
backup.

## Access from the Mac

SonicInfra only ships a Linux build of the `sonic` CLI, so `~/.local/bin/sonic` is a wrapper that runs
it in the local `sonic-cli` Docker image (Docker Desktop must be running). Login is kept in the
`sonic-home` Docker volume; run `sonic login` again when the session expires (about a week).

```bash
sonic status
ssh zsalehi313@apps-01.sonicinfra     # via the ProxyCommand block in ~/.ssh/config
```

Rebuild the wrapper image (e.g. for a new CLI version):

```bash
docker build -t sonic-cli - <<'EOF'
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssh-client rsync curl && rm -rf /var/lib/apt/lists/*
ADD --chmod=755 https://sonicinfra.com/cli/versions/latest/sonic-linux-aarch64 /usr/local/bin/sonic
ENTRYPOINT ["sonic"]
EOF
```

## Adding another site or app

1. Deploy it in its own folder under `/srv/<name>`, with no published ports, joined to the external
   `edge` network with a unique alias (see `docker-compose.edge.yml` for the pattern).
   Static sites need no container: put the files in `/srv/edge/www/<domain>`.
2. Add `/srv/edge/sites/<name>.caddy` (templates in `deploy/edge/sites/`), then reload:
   `cd /srv/edge && docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile`
3. In Cloudflare DNS, point the domain's A record at `65.19.176.194` with the proxy off (grey cloud).
   Caddy gets the certificate on the first request.

The shared Caddy is deliberately not deployed by this app's pipeline, because every site depends on
it. `deploy/edge/` in this repo is its source; copy changes by hand and reload:

```bash
rsync -az deploy/edge/ zsalehi313@apps-01.sonicinfra:/srv/edge/
ssh zsalehi313@apps-01.sonicinfra 'cd /srv/edge && docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile'
```

## Backups

`scripts/backup.sh` runs nightly at 03:15 UTC from the instance's crontab:
`15 3 * * * cd /srv/blockbusterstrivia-app && ./scripts/backup.sh >> backup.log 2>&1`

Dumps go to `/srv/blockbusterstrivia-app/backups/` (kept 14 days), on the same volume as the
database. That protects against a bad migration or an accidental delete, not against losing the
volume: set `RCLONE_REMOTE` in the server `.env` (with an rclone crypt remote) for an offsite copy.

Restore into the running database (replaces its contents):

```bash
docker compose exec -T db psql -U bbt -d bbt -c "drop schema public cascade; create schema public;"
docker compose exec -T db pg_restore -U bbt -d bbt --no-owner < backups/bbt-XXXX.dump
```
