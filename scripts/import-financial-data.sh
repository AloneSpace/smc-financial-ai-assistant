#!/usr/bin/env bash
#
# Import the provided financial_data dataset into the running PostgreSQL
# container and apply its indexes. Run after `docker compose up`.
#
#   ./scripts/import-financial-data.sh
#
# Overridable via env: POSTGRES_CONTAINER, POSTGRES_USER, POSTGRES_DB.
# The data file path may be passed as the first argument.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

CONTAINER="${POSTGRES_CONTAINER:-finchat-postgres}"
DB="${POSTGRES_DB:-finchat}"
DB_USER="${POSTGRES_USER:-postgres}"
DATA_FILE="${1:-${REPO_ROOT}/data/financial_data.sql}"

if [ ! -f "${DATA_FILE}" ]; then
  echo "error: data file not found at ${DATA_FILE}" >&2
  exit 1
fi

echo "Importing ${DATA_FILE} into ${CONTAINER}/${DB} ..."
docker exec -i "${CONTAINER}" psql -v ON_ERROR_STOP=1 -U "${DB_USER}" -d "${DB}" < "${DATA_FILE}"

echo "Applying indexes ..."
docker exec -i "${CONTAINER}" psql -v ON_ERROR_STOP=1 -U "${DB_USER}" -d "${DB}" < "${SCRIPT_DIR}/financial-data-indexes.sql"

COUNT=$(docker exec "${CONTAINER}" psql -tAc "SELECT COUNT(*) FROM financial_data" -U "${DB_USER}" -d "${DB}")
echo "Done. financial_data row count: ${COUNT}"
