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
├── ingress.yaml               ← Traefik IngressRoute
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
| `FRONTEND_URL`                   | `https://finchat.local`|

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

## Deployment Steps

### 1 — Build images and import into k3s

```bash
docker build -t finchat-backend:latest --target production ./backend
docker build -t finchat-frontend:latest --target production ./frontend

# Single-node k3s: import directly into containerd (no registry needed)
docker save finchat-backend:latest  | sudo k3s ctr images import -
docker save finchat-frontend:latest | sudo k3s ctr images import -
```

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
applied from a committed file.

### 4 — Import financial data

```bash
kubectl wait --for=condition=Ready pod -l app=postgres -n finchat --timeout=90s
POSTGRES_POD=$(kubectl get pod -l app=postgres -n finchat -o jsonpath='{.items[0].metadata.name}')
kubectl cp data/financial_data.sql finchat/${POSTGRES_POD}:/tmp/financial_data.sql
kubectl exec -n finchat ${POSTGRES_POD} -- psql -U postgres finchat -f /tmp/financial_data.sql
```

### 5 — Verify

```bash
kubectl get pods,svc,pvc -n finchat
curl http://finchat.local/api/health   # add finchat.local to /etc/hosts → k3s node IP
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
- [ ] Ingress TLS configured (cert-manager + Let's Encrypt recommended)
- [ ] `FRONTEND_URL` in the ConfigMap matches the real ingress host (CORS)
