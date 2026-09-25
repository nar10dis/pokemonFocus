FROM docker.io/library/node:24-alpine AS base
WORKDIR /app

# --- dev : le code est monté en volume, deps installées au démarrage
FROM base AS dev
ENV NODE_ENV=development
# socat : relaie Prisma Studio (forcé sur 127.0.0.1) vers 0.0.0.0 pour qu'il soit
# joignable depuis l'hôte via le port mappé dans docker-compose.yml
RUN apk add --no-cache socat
EXPOSE 4000
CMD ["sh", "-c", "npm install && npx prisma generate && npx prisma migrate deploy && npx prisma db seed && npm run start:dev"]

# --- build prod
FROM base AS build
COPY package*.json ./
RUN npm ci
COPY . .
# prisma.config.ts exige DATABASE_URL, mais `generate` ne se connecte pas à la base :
# une URL factice suffit au build (la vraie est fournie au lancement du conteneur)
RUN DATABASE_URL=postgresql://build@localhost/build npx prisma generate && npm run build

# --- release prod : migrations + seed du Pokédex, lancé une fois avant chaque
# démarrage du backend (cf. docker-compose.prod.yml). Part de `build` car prisma
# et tsx sont en devDependencies, absents de l'image `prod`.
FROM build AS release
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed"]

FROM base AS prod
ENV NODE_ENV=production
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./
EXPOSE 4000
CMD ["node", "dist/main"]
