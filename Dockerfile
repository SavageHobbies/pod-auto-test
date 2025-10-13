### Stage 1: build
FROM node:20-alpine AS builder
WORKDIR /app
# Install dependencies (prefer npm ci when lockfile exists)
COPY package.json package-lock.json* ./
COPY . .
RUN npm ci --silent || npm install --silent
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server ./server
# Install only production dependencies (express, node-fetch)
RUN npm ci --omit=dev --silent || npm install --omit=dev --silent
EXPOSE 80
CMD ["node", "server/server.js"]
