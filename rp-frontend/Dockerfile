# ===== build =====
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build-time config: Vite inlines VITE_* variables into the static bundle.
ARG VITE_DISCORD_SERVER_URL=""
ENV VITE_DISCORD_SERVER_URL=$VITE_DISCORD_SERVER_URL
RUN npm run build


# ===== production (static SPA served by nginx on :5000) =====
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 5000

CMD ["nginx", "-g", "daemon off;"]
