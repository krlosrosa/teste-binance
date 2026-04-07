# Build — npm ci sem lifecycle scripts (evita postinstall/prisma antes do ambiente estar pronto)
FROM node:20-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y openssl ca-certificates python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci --ignore-scripts

ENV DATABASE_URL=file:/app/prisma/docker-build.db
RUN npx prisma generate

COPY . .
RUN npm run build

# Runtime
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
RUN apt-get update && apt-get install -y openssl ca-certificates python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev --ignore-scripts

# bcrypt precisa do build nativo (postinstall foi ignorado)
RUN npm rebuild bcrypt

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3001/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
