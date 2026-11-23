#!/usr/bin/env bash
# Run on the server from the project folder. Prompts for the Google email settings and writes them to .env.
set -euo pipefail
ENV_FILE="${ENV_FILE:-.env}"
[ -f "$ENV_FILE" ] || { echo "No $ENV_FILE here. cd into the project folder first."; exit 1; }

set_key() { # key value
  local key="$1" value="$2" tmp
  tmp="$(mktemp)"
  grep -v "^${key}=" "$ENV_FILE" > "$tmp" || true
  printf '%s=%s\n' "$key" "$value" >> "$tmp"
  cat "$tmp" > "$ENV_FILE"
  rm -f "$tmp"
}

read -r -p "Sending mailbox (e.g. you@blockbusterstrivia.com): " user
read -r -p "Google client ID: " cid
read -r -s -p "Google client secret (hidden): " csec; echo
read -r -s -p "Google refresh token (hidden): " rtok; echo
read -r -p "From address [BlockBusters <noreply@blockbusterstrivia.com>]: " from
from="${from:-BlockBusters <noreply@blockbusterstrivia.com>}"

set_key SMTP_USER "$user"
set_key GOOGLE_CLIENT_ID "$cid"
set_key GOOGLE_CLIENT_SECRET "$csec"
set_key GOOGLE_REFRESH_TOKEN "$rtok"
set_key EMAIL_FROM "$from"
set_key EMAIL_CONSOLE false
set_key SMTP_HOST ""
set_key RESEND_API_KEY ""
chmod 600 "$ENV_FILE"
echo "Saved to $ENV_FILE. Now run: docker compose up -d"
