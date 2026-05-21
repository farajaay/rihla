FROM node:20-alpine AS base
WORKDIR /app

# ---- deps stage ----
FROM base AS deps
COPY apps/api/package.json apps/api/package-lock.json ./
COPY apps/api/prisma ./prisma/
RUN npm ci --ignore-scripts

# ---- build stage ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY apps/api/ .
RUN ./node_modules/.bin/prisma generate
RUN npm run build

# ---- runner stage ----
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
RUN apk add --no-cache openssl libc6-compat

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY apps/api/package.json ./

EXPOSE 3000
CMD ["node", "dist/index.js"]
