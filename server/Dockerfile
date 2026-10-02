# Image de production : Node 22 (better-sqlite3 y a des binaires precompiles).
# `npm ci --omit=dev` installe uniquement la production ; la compilation native
# est déclenchée par le champ allowScripts du package.json.
FROM node:22-bookworm-slim

WORKDIR /app

# Dépendances d'abord : tant que le lockfile ne change pas, cette couche est
# réutilisée d'un build à l'autre.
COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV NODE_ENV=production
ENV PORT=3001
# Le fichier SQLite est sur un volume (monté sur /data) en production ; ce
# chemin par défaut garde le conteneur functional en local.
ENV DATABASE_PATH=/data/tg.sqlite

EXPOSE 3001

# Healthcheck : Railway et Render l'utilisent pour savoir quand l'app répond.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/index.js"]
