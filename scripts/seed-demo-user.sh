#!/usr/bin/env bash
#
# Register the local development demo account against the running backend.
#
#   ./scripts/seed-demo-user.sh
#
# Overridable via env: API_URL, DEMO_EMAIL, DEMO_PASSWORD, DEMO_NAME.
# Safe to re-run — an already-registered account is reported and skipped.
set -euo pipefail

API_URL="${API_URL:-http://localhost:3000/api}"
DEMO_EMAIL="${DEMO_EMAIL:-demo@finchat.com}"
DEMO_PASSWORD="${DEMO_PASSWORD:-thisisfordemo}"
DEMO_NAME="${DEMO_NAME:-Demo User}"

echo "Registering ${DEMO_EMAIL} at ${API_URL}/auth/register ..."

RESPONSE=$(curl -sS -o /dev/null -w '%{http_code}' \
  -X POST "${API_URL}/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${DEMO_EMAIL}\",\"name\":\"${DEMO_NAME}\",\"password\":\"${DEMO_PASSWORD}\"}")

case "${RESPONSE}" in
  201|200)
    echo "Done. Log in with ${DEMO_EMAIL} / ${DEMO_PASSWORD}"
    ;;
  409)
    echo "Already registered — nothing to do."
    ;;
  *)
    echo "error: register failed with HTTP ${RESPONSE}" >&2
    exit 1
    ;;
esac
