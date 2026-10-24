FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev express web-push node-cron
COPY server ./server
COPY --from=build /app/dist ./dist
VOLUME ["/app/data"]
EXPOSE 3011
CMD ["node", "server/index.js"]
