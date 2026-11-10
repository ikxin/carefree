FROM node:24-alpine AS builder

WORKDIR /app

RUN apk add --no-cache build-base python3 && corepack enable

COPY . .

RUN pnpm install --frozen-lockfile

RUN NITRO_PRESET=node-server pnpm run build

FROM node:24-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache ca-certificates postgresql18-client

COPY --from=builder /app/.output ./.output

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
