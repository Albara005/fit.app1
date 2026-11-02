# Railway builds a root Dockerfile automatically. Two stages: Expo builds the
# web export with every dependency in reach, and the image that runs holds only
# Node, the export and server/serve.mjs, which has no dependencies of its own.

FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV CI=1 EXPO_NO_TELEMETRY=1

# The lockfile alone first, so a change to the app reuses the installed modules.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Expo writes EXPO_PUBLIC_* into the bundle at build time; the running server
# never reads them, so changing one means a new build, not a restart. Railway
# hands a Dockerfile build only the variables declared with ARG, in the stage
# that declares them. Declared after the install, so changing one does not
# reinstall the modules.
ARG EXPO_PUBLIC_SUPABASE_URL
ARG EXPO_PUBLIC_SUPABASE_ANON_KEY
ARG EXPO_PUBLIC_SUPABASE_REGION
ARG EXPO_PUBLIC_POLICY_VERSION
ARG EXPO_PUBLIC_FOOD_DB_URL

COPY . .
RUN npx expo export --platform web --clear

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node server/serve.mjs ./server/serve.mjs
USER node
# Railway injects PORT; the server falls back to 8080 elsewhere.
CMD ["node", "server/serve.mjs"]
