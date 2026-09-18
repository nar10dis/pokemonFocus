FROM docker.io/library/node:24-alpine AS base
WORKDIR /app

# --- dev : le code est monté en volume, deps installées au démarrage
FROM base AS dev
ENV NODE_ENV=development
EXPOSE 4000
CMD ["sh", "-c", "npm install && npx prisma generate && npx prisma migrate deploy && npx prisma db seed && npm run start:dev"]

# --- build prod
FROM base AS build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

FROM base AS prod
ENV NODE_ENV=production
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./
EXPOSE 4000
CMD ["node", "dist/main"]
