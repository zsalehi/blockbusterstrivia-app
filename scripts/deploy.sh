#!/usr/bin/env bash
# Runs on the server. Started by the GitHub Actions deploy key (see docs/sonicinfra.md).
# Everything is inside main() because bash reads a script while it runs, and the
# `git reset` below rewrites this very file. Calling main at the end means the
# whole script has been read before anything executes.
set -euo pipefail

main() {
  cd /srv/blockbusterstrivia-app
  git fetch --quiet origin main
  git reset --hard --quiet origin/main
  echo "Deploying $(git log -1 --format='%h %s')"

  docker compose up -d --build
  docker builder prune -af >/dev/null

  for _ in $(seq 1 30); do
    status=$(docker inspect -f '{{.State.Health.Status}}' "$(docker compose ps -q app)")
    if [ "$status" = healthy ]; then echo "App healthy"; return 0; fi
    sleep 2
  done
  echo "App did not become healthy:"; docker compose logs --tail 50 app
  return 1
}

main "$@"