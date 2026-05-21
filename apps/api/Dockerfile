FROM node:20-alpine AS base
WORKDIR /app

# ---- deps stage ----
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci

# ---- build stage ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- runner stage ----
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000

RUN apk add --no-cache openssl

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY package.json ./

# remove dev deps to shrink image
RUN npm prune --omit=dev

EXPOSE 3000

CMD ["sh", "-c", "if [ -z \"$DATABASE_URL\" ]; then echo 'DATABASE_URL is missing'; exit 1; fi && npx prisma migrate deploy && node dist/index.js"]
