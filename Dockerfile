FROM node:24-alpine AS builder

WORKDIR /app

RUN apk add --no-cache \
    build-base \
    python3

ENV PYTHON=/usr/bin/python3 \
    npm_config_disturl=https://npmmirror.com/mirrors/node

RUN corepack enable && corepack prepare pnpm@12.4.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN NITRO_PRESET=node-server pnpm run build

FROM postgres:18-alpine AS postgres-client

FROM node:24-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080

RUN apk add --no-cache \
    ca-certificates \
    libpq \
    zstd-libs \
    lz4-libs \
    krb5-libs \
    libldap \
    libedit

COPY --from=postgres-client /usr/local/bin/pg_dump /usr/local/bin/pg_dump
COPY --from=postgres-client /usr/local/lib/libpq.so.5* /usr/local/lib/

RUN pg_dump --version | grep -q '^pg_dump (PostgreSQL) 18'

COPY --from=builder /app/.output /app/.output

EXPOSE 8080

CMD ["node", ".output/server/index.mjs"]
