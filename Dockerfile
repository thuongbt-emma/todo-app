FROM node:22-alpine
WORKDIR /app
# prisma.config.ts reads DATABASE_URL at generate time; a placeholder is enough to build
ARG DATABASE_URL=postgresql://build:build@localhost:5432/build
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci
COPY . .
# Dokploy "drop" (zip upload) rejects paths containing ( ) [ ] or "..." (route groups,
# dynamic routes). scripts/make-upload.sh encodes those names before zipping; restore
# them here. No-op for git-based or local builds.
RUN node scripts/restore-routes.mjs src/app
RUN npm run build
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && npx next start -p 3000"]
