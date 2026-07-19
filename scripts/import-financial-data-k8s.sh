#!/usr/bin/env bash
#
# Import the provided financial_data dataset into the PostgreSQL pod running in
# Kubernetes and apply its indexes. The k8s counterpart of
# import-financial-data.sh. Run after `kubectl apply -k deploy/`.
#
#   ./scripts/import-financial-data-k8s.sh
#
# Application tables (users, conversations, messages) and their indexes are NOT
# handled here — the backend runs TypeORM migrations at boot (migrationsRun).
#
# Credentials are read from the finchat-secret Secret (the same source the
# postgres pod itself uses), so this works whatever POSTGRES_USER was generated.
# Overridable via env: NAMESPACE, SECRET_NAME, POSTGRES_USER, POSTGRES_DB.
# The data file path may be passed as the first argument.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

NAMESPACE="${NAMESPACE:-finchat}"
SECRET_NAME="${SECRET_NAME:-finchat-secret}"
DATA_FILE="${1:-${REPO_ROOT}/data/financial_data.sql}"

secret_key() {
  kubectl get secret "${SECRET_NAME}" -n "${NAMESPACE}" \
    -o "jsonpath={.data.$1}" 2>/dev/null | base64 -d
}

DB_USER="${POSTGRES_USER:-$(secret_key POSTGRES_USER)}"
DB="${POSTGRES_DB:-$(secret_key POSTGRES_DB)}"

if [ -z "${DB_USER}" ] || [ -z "${DB}" ]; then
  echo "error: could not read POSTGRES_USER/POSTGRES_DB from secret ${SECRET_NAME}" \
       "in namespace ${NAMESPACE}; set them via env instead" >&2
  exit 1
fi

if [ ! -f "${DATA_FILE}" ]; then
  echo "error: data file not found at ${DATA_FILE}" >&2
  exit 1
fi

echo "Waiting for the postgres pod to become Ready ..."
kubectl wait --for=condition=Ready pod -l app=postgres -n "${NAMESPACE}" --timeout=90s

POD="$(kubectl get pod -l app=postgres -n "${NAMESPACE}" -o jsonpath='{.items[0].metadata.name}')"

# Pipe over stdin rather than `kubectl cp` so no copy is left behind in the pod.
psql_in() {
  kubectl exec -i -n "${NAMESPACE}" "${POD}" -- \
    psql -v ON_ERROR_STOP=1 -U "${DB_USER}" -d "${DB}" < "$1"
}

echo "Importing ${DATA_FILE} into ${NAMESPACE}/${POD} ..."
psql_in "${DATA_FILE}"

echo "Applying indexes ..."
psql_in "${SCRIPT_DIR}/financial-data-indexes.sql"

COUNT=$(kubectl exec -n "${NAMESPACE}" "${POD}" -- \
  psql -tAc "SELECT COUNT(*) FROM financial_data" -U "${DB_USER}" -d "${DB}")
echo "Done. financial_data row count: ${COUNT}"
