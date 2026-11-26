#!/usr/bin/env bash
# Nightly Postgres backup. Run from the repo root via cron, e.g.:
#   15 3 * * * cd /srv/blockbusterstrivia-app && ./scripts/backup.sh >> backup.log 2>&1
#
# Needs: docker compose, and (for offsite copy) rclone configured with a remote.
# Set in the environment or .env: RCLONE_REMOTE (e.g. b2:bbt-backups), HEALTHCHECK_URL (optional).
set -euo pipefail
cd "$(dirname "$0")/.."
# Read only the keys this script uses. (.env isn't valid shell: EMAIL_FROM holds "<...>".)
env_get() { [ -f .env ] && grep -m1 "^$1=" .env | cut -d= -f2- || true; }
for key in POSTGRES_USER POSTGRES_DB BACKUP_DIR RCLONE_REMOTE HEALTHCHECK_URL; do
  [ -n "${!key:-}" ] || printf -v "$key" '%s' "$(env_get "$key")"
done

BACKUP_DIR="${BACKUP_DIR:-./backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/bbt-$STAMP.dump"
mkdir -p "$BACKUP_DIR"

docker compose exec -T db pg_dump -U "${POSTGRES_USER:-bbt}" -d "${POSTGRES_DB:-bbt}" -Fc > "$FILE"
[ -s "$FILE" ] || { echo "backup is empty" >&2; rm -f "$FILE"; exit 1; }

if [ -n "${RCLONE_REMOTE:-}" ]; then
  rclone copy "$FILE" "$RCLONE_REMOTE"
fi

find "$BACKUP_DIR" -name 'bbt-*.dump' -mtime +14 -delete

[ -n "${HEALTHCHECK_URL:-}" ] && curl -fsS -m 10 --retry 3 "$HEALTHCHECK_URL" >/dev/null
echo "backup ok: $FILE"

# Restore (into an empty database):
#   docker compose exec -T db pg_restore -U bbt -d bbt --clean --if-exists < backups/bbt-XXXX.dump
