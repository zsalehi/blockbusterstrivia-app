# Running on SonicInfra

Production runs on a SonicInfra Compute Instance behind one shared Caddy, so the same
server can host more sites and apps.

```
Internet → L4 load balancer apps-lb (65.19.176.194, TCP 80→80, 443→443, selects label role=apps)
         → instance apps-01 (ne.2, Ubuntu 26.04, label role=apps)
             /srv/edge                    shared Caddy: HTTPS for every domain, routes by hostname
             /srv/blockbusterstrivia-app  Postgres + Next.js app (alias bbt-app on the edge network)
```

Instances have no public IP of their own; the load balancer sends traffic to anything labelled
`role=apps`. Load balancers can't be edited, only deleted and recreated (which changes the IP).

## Storage

Everything that matters lives on the `apps-data` volume (30Gi), not the instance's root disk:

```
/data              volume apps-data, mounted by label via /etc/fstab (nofail)
├── docker/        Docker's data-root (/etc/docker/daemon.json): images, Postgres data, Caddy certificates
└── srv/           app folders and their .env files; /srv is a symlink to it
```

`/etc/systemd/system/docker.service.d/data-volume.conf` has `RequiresMountsFor=/data`, so Docker
won't start without the volume (it would otherwise come up with an empty database).

Rebuilding the server: create a new instance with label `role=apps` and the `apps-data` volume, then
on it: add the fstab line `LABEL=apps-data /data ext4 defaults,nofail 0 2`, `mount /data`,
recreate `daemon.json`, the systemd drop-in and the `/srv` symlink, `apt install docker.io
docker-compose-v2 docker-buildx`, and `docker compose up -d` in `/srv/edge` and each app folder.

The volume is not a backup: it faithfully keeps a deleted or corrupted database. See Backups.

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

## Deploying an update

From the Mac, in the repo:

```bash
rsync -az --delete --exclude node_modules --exclude .next --exclude .git --exclude .env --exclude '.env.local' \
  --exclude .DS_Store --exclude tsconfig.tsbuildinfo --exclude /deploy --exclude /backups --exclude backup.log \
  ./ zsalehi313@apps-01.sonicinfra:/srv/blockbusterstrivia-app/
ssh zsalehi313@apps-01.sonicinfra \
  'cd /srv/blockbusterstrivia-app && docker compose up -d --build && docker builder prune -af'
```

The server `.env` sets `COMPOSE_FILE=docker-compose.yml:docker-compose.edge.yml`, which turns off this
project's own Caddy and joins the app to the shared `edge` network. Unraid keeps using the plain
`docker-compose.yml` with its own Caddy.

Schema changes are not applied automatically on an existing database:
`docker compose exec -T db psql -U bbt -d bbt < db/005_whatever.sql`

## Adding another site or app

1. Deploy it in its own folder under `/srv/<name>`, with no published ports, joined to the external
   `edge` network with a unique alias (see `docker-compose.edge.yml` for the pattern).
   Static sites need no container: put the files in `/srv/edge/www/<domain>`.
2. Add `/srv/edge/sites/<name>.caddy` (templates in `deploy/edge/sites/`), then reload:
   `cd /srv/edge && docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile`
3. In Cloudflare DNS, point the domain's A record at `65.19.176.194` with the proxy off (grey cloud).
   Caddy gets the certificate on the first request.

`deploy/edge/` in this repo is the source for `/srv/edge`; copy changes with
`rsync -az deploy/edge/ zsalehi313@apps-01.sonicinfra:/srv/edge/`.

## Backups

Same script as on Unraid, run on the instance by cron:
`15 3 * * * cd /srv/blockbusterstrivia-app && ./scripts/backup.sh >> backup.log 2>&1`
With `RCLONE_REMOTE` unset the dumps stay on the server, which is not a backup.
