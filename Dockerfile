# Self-host image. The primary/recommended deploy path is Vercel + a
# hosted Postgres (see README) — this is for running the whole stack
# yourself with `docker compose up` (see docker-compose.yml).

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Dev stays on SQLite; this image always targets Postgres (see
# scripts/swap-datasource.js and DATABASE_URL in docker-compose.yml).
RUN node scripts/swap-datasource.js postgresql
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# The standalone build doesn't bundle the Prisma CLI — copied separately
# so `docker compose run app npx prisma db push` works for the one-time
# schema sync documented in the README.
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
