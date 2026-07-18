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
RUN npm install
COPY . .
RUN npm run build

# ── Production (nginx serving the built SPA) ─────────────────
FROM nginx:1.27-alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
