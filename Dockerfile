# Build
FROM node:20-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y openssl ca-certificates python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma/
# Sem .env na imagem: postinstall (prisma generate) precisa de DATABASE_URL
RUN DATABASE_URL="file:./prisma/docker-build.db" npm ci

COPY . .
RUN DATABASE_URL="file:./prisma/docker-build.db" npx prisma generate && npm run build

# Runtime
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
RUN apt-get update && apt-get install -y openssl ca-certificates python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN DATABASE_URL="file:./prisma/docker-build.db" npm ci --omit=dev

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3001/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
