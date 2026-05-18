FROM node:20-alpine

ENV NODE_ENV=production

WORKDIR /app

# Kopiere zuerst nur package.json um den Docker Cache für npm install optimal zu nutzen
COPY package*.json ./
RUN npm install --omit=dev

# Kopiere den Rest des Codes
COPY --chown=node:node . .

# Wechsle zu einem non-root Benutzer für mehr Sicherheit
USER node

EXPOSE 3001
CMD ["npm", "start"]