FROM docker.io/library/node:24-alpine AS base
WORKDIR /app

# --- dev : le code est monté en volume, deps installées au démarrage
FROM base AS dev
ENV NODE_ENV=development
EXPOSE 3000
CMD ["sh", "-c", "npm install && npm run dev -- --hostname 0.0.0.0"]

# --- build prod
FROM base AS build
COPY package*.json ./
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

FROM base AS prod
ENV NODE_ENV=production
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.ts ./
EXPOSE 3000
CMD ["npm", "start"]
