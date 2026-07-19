# Deployment — k3s / Kubernetes

**Project:** Financial AI Chat Assistant
**Target:** k3s (lightweight Kubernetes)
**Namespace:** `finchat`

> **Local development** uses `compose.yml` at the project root.
> This folder contains Kubernetes manifests for all services.
>
> **AI provider:** This project uses **Anthropic Claude Opus** (`claude-opus-4-8`)
> — a deliberate change from the take-home's original OpenAI requirement.

---

## Folder Structure

```
deploy/
├── README.md                  ← This file
├── kustomization.yaml         ← Applies everything except the Secret
├── namespace.yaml             ← finchat namespace
├── configmap.yaml             ← Non-secret env vars
├── secret.example.yaml        ← Secret template (placeholders only — never commit real values)
├── ingress.yaml               ← Traefik IngressRoute (HTTPS + HTTP→HTTPS redirect)
├── cert-issuer.yaml           ← cert-manager ClusterIssuer + Certificate (Let's Encrypt)
├── postgres/
│   ├── pvc.yaml               ← PersistentVolumeClaim (5Gi, local-path)
│   ├── statefulset.yaml       ← PostgreSQL 16 StatefulSet
│   └── service.yaml           ← ClusterIP :5432 (Service name: postgres)
├── redis/
│   ├── deployment.yaml        ← Redis 7 Deployment
│   └── service.yaml           ← ClusterIP :6379 (Service name: redis)
├── backend/
│   ├── deployment.yaml        ← NestJS Deployment (liveness + readiness on /health)
│   └── service.yaml           ← ClusterIP :3000 (Service name: backend)
└── frontend/
    ├── deployment.yaml        ← Nginx serving built React SPA
    └── service.yaml           ← ClusterIP :80 (Service name: frontend)
```

In-cluster service DNS (used in `DATABASE_URL` / `REDIS_URL`): `postgres`, `redis`,
`backend`, `frontend` (all in the `finchat` namespace).

---

## Resource Names (must stay in sync)

| Kind      | Name             | Referenced by                              |
| --------- | ---------------- | ------------------------------------------ |
| ConfigMap | `finchat-config` | backend Deployment (`envFrom.configMapRef`) |
| Secret    | `finchat-secret` | postgres + backend (`envFrom.secretRef`)    |

---

## `configmap.yaml` — non-secret env

| Key                              | Value                  |
| -------------------------------- | ---------------------- |
| `NODE_ENV`                       | `production`           |
| `PORT`                           | `3000`                 |
| `ANTHROPIC_MODEL`                | `claude-opus-4-8`      |
| `ANTHROPIC_MAX_HISTORY_MESSAGES` | `20`                   |
| `USAGE_BUDGET_USD`               | `1.0`                  |
| `USAGE_RESET_INTERVAL_SECONDS`   | `3600`                 |
| `JWT_EXPIRY`                     | `24h`                  |
| `FRONTEND_URL`                   | `https://finchat.plaintechlab.com` |

> `FRONTEND_URL` must exactly match the ingress host (scheme + host) — the
> backend uses it as the CORS allow-origin (`backend/src/main.ts`).

## `secret.example.yaml` — TEMPLATE ONLY

Placeholders only. Never commit real values. Keys required by the manifests:
`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DATABASE_URL`, `REDIS_URL`,
`JWT_SECRET` (min 32 chars), `ANTHROPIC_API_KEY`.

Create the real secret out-of-band:

```bash
kubectl create secret generic finchat-secret \
  --namespace finchat \
  --from-literal=POSTGRES_USER="postgres" \
  --from-literal=POSTGRES_PASSWORD="$(openssl rand -hex 16)" \
  --from-literal=POSTGRES_DB="finchat" \
  --from-literal=DATABASE_URL="postgresql://postgres:<pw>@postgres:5432/finchat" \
  --from-literal=REDIS_URL="redis://redis:6379" \
  --from-literal=JWT_SECRET="$(openssl rand -hex 32)" \
  --from-literal=ANTHROPIC_API_KEY="sk-ant-..."
```

---

## Domain & TLS

The stack serves a **single host** with path-based routing:
`finchat.plaintechlab.com/` → frontend, `finchat.plaintechlab.com/api` → backend.
The backend is *not* on a separate subdomain, so there is no cross-origin (CORS)
split and no separate API DNS record.

### DNS

Point one `A` record at the public IP of the k3s node (the one running Traefik):

```
finchat.plaintechlab.com   A   <k3s-node-public-IP>
```

If the domain sits behind Cloudflare, set it to **DNS-only (grey cloud)** at least
until the first certificate is issued — the proxy otherwise intercepts the
Let's Encrypt HTTP-01 challenge.

### TLS (cert-manager + Let's Encrypt)

`cert-issuer.yaml` defines a `ClusterIssuer` (Let's Encrypt production, HTTP-01
challenge solved through Traefik) and a `Certificate` that writes the issued cert
into the `finchat-tls` secret referenced by `ingress.yaml`. Before applying, set a
real contact address in `cert-issuer.yaml` (`spec.acme.email`).

cert-manager itself is a **cluster prerequisite** — install it once:

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml
```

---

## Deployment Steps

### 1 — Build images and import into k3s

```bash
docker build -t finchat-backend:latest  --target production ./backend
# Frontend: VITE_API_URL is baked in at build time. Leave it empty so the SPA
# calls the API on the same origin via /api (matches the path-routing ingress).
docker build -t finchat-frontend:latest --target production --build-arg VITE_API_URL="" ./frontend

# Single-node k3s: import directly into containerd (no registry needed)
docker save finchat-backend:latest  | sudo k3s ctr images import -
docker save finchat-frontend:latest | sudo k3s ctr images import -
```

> Using CI-published GHCR images instead? They already build with an empty
> `VITE_API_URL` (see `frontend/Dockerfile`), so they call `/api` same-origin
> out of the box — just point `kustomization.yaml` `images:` at your tags.

### 2 — Namespace + Secret first

```bash
kubectl apply -f deploy/namespace.yaml
# Create the real secret (see command above) — NOT committed to git.
```

### 3 — Apply everything else

```bash
kubectl apply -k deploy/
```

`kustomization.yaml` intentionally omits the Secret so credentials are never
applied from a committed file. It **does** include `cert-issuer.yaml`; make sure
cert-manager is installed first (see above) or those resources fail to apply.

Watch the certificate become ready (usually within ~1–2 minutes):

```bash
kubectl get certificate -n finchat        # READY should flip to True
kubectl describe certificate finchat-tls -n finchat   # if it stalls
```

### 4 — Import financial data

```bash
./scripts/import-financial-data-k8s.sh
```

Waits for the postgres pod, imports `data/financial_data.sql`, applies the
`financial_data` indexes (`docs/05_DATABASE.md` §8.1), and prints the row count.
Both SQL files are idempotent, so re-running is safe.

Application tables (`users`, `conversations`, `messages`) and their indexes
(§8.2) need no step here — the backend runs its TypeORM migrations at boot
(`migrationsRun: true`; `synchronize` is off everywhere).

<details>
<summary>Equivalent manual commands</summary>

```bash
kubectl wait --for=condition=Ready pod -l app=postgres -n finchat --timeout=90s
POSTGRES_POD=$(kubectl get pod -l app=postgres -n finchat -o jsonpath='{.items[0].metadata.name}')

# POSTGRES_USER is generated per-deployment — read it from the Secret rather
# than assuming "postgres", or psql fails with: role "postgres" does not exist
PGUSER=$(kubectl get secret finchat-secret -n finchat -o jsonpath='{.data.POSTGRES_USER}' | base64 -d)

kubectl exec -i -n finchat ${POSTGRES_POD} -- \
  psql -v ON_ERROR_STOP=1 -U ${PGUSER} -d finchat < data/financial_data.sql
kubectl exec -i -n finchat ${POSTGRES_POD} -- \
  psql -v ON_ERROR_STOP=1 -U ${PGUSER} -d finchat < scripts/financial-data-indexes.sql
```

</details>

### 5 — Verify

```bash
kubectl get pods,svc,pvc -n finchat
kubectl get certificate -n finchat                 # finchat-tls READY=True

# Schema: 3 idx_financial_data_* plus the migration-created app indexes (5 total)
kubectl exec -n finchat statefulset/postgres -- \
  psql -U $(kubectl get secret finchat-secret -n finchat -o jsonpath='{.data.POSTGRES_USER}' | base64 -d) \
       -d finchat -c "\di idx_*"
curl https://finchat.plaintechlab.com/api/health   # → { "status": "ok" }
```

Before DNS has propagated you can still test against the node IP directly:

```bash
curl --resolve finchat.plaintechlab.com:443:<k3s-node-IP> \
  https://finchat.plaintechlab.com/api/health
```

---

## Useful commands

```bash
kubectl logs -f -l app=backend -n finchat
kubectl exec -it -n finchat deploy/backend -- sh
kubectl rollout restart deployment/backend -n finchat
kubectl delete -k deploy/            # tears down (PVC preserved)
kubectl delete pvc --all -n finchat  # WARNING: destroys data
```

---

## SSE note

Traefik (k3s default ingress) streams Server-Sent Events natively — no special
middleware needed. The backend sets `X-Accel-Buffering: no` on `/chat` so no proxy
buffers the token stream.

---

## Security Checklist

- [ ] Real Secret created via `kubectl create secret` — never from committed YAML
- [ ] `secret.example.yaml` holds only placeholder values
- [ ] `ANTHROPIC_API_KEY` scoped/limited in the Anthropic console
- [ ] Postgres and Redis are ClusterIP only (never exposed outside the cluster)
- [x] Ingress TLS via cert-manager + Let's Encrypt (`cert-issuer.yaml`); HTTP redirects to HTTPS
- [ ] Real contact email set in `cert-issuer.yaml` (`spec.acme.email`)
- [ ] `FRONTEND_URL` in the ConfigMap matches the real ingress host (CORS)
