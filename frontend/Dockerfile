# --- Stage 1: Build ---
FROM node:20-alpine AS builder
WORKDIR /app

# Nutze Caching optimal aus
COPY package*.json ./
RUN npm install
COPY . .
# Baut die Applikation (z.B. nach /app/dist oder /app/build)
RUN npm run build

# --- Stage 2: Production Webserver ---
FROM nginx:alpine
# Kopiere die kompilierten Dateien aus der Build-Stage (Passe "dist" an dein Framework an, z.B. "build" bei React)
COPY --from=builder /app/dist /usr/share/nginx/html

# (Wichtig für SPAs): Kopiere eine Nginx-Konfiguration, die try_files $uri /index.html nutzt.
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80