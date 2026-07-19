# ── Base ──────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# ── Development (docker compose, Vite dev server + HMR) ───────
FROM base AS development
ENV NODE_ENV=development
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

# ── Build (production static assets) ─────────────────────────
FROM base AS build
# VITE_API_URL is baked into the bundle at build time (Vite inlines
# import.meta.env.*). Empty = call the API on the same origin via /api,
# which is what the path-routing ingress expects. Override with a full
# origin (e.g. https://api.example.com) only for a split-subdomain setup.
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN npm install
COPY . .
RUN npm run build

# ── Production (nginx serving the built SPA) ─────────────────
FROM nginx:1.27-alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
