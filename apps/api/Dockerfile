FROM node:20-alpine AS base
WORKDIR /app

# ---- deps stage: install with lockfile for reproducible builds ----
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci --ignore-scripts

# ---- build stage: compile TS ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN ./node_modules/.bin/prisma generate
RUN npm run build

# ---- runner stage: slim runtime image ----
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
RUN apk add --no-cache openssl libc6-compat

# Only what runtime needs
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY package.json ./

EXPOSE 3000

# Migrate then start. If migrations fail the container crashes — Railway restarts.
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/index.js"]
