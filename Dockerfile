FROM node:23-alpine3.20 AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm i
COPY . .


FROM node:23-alpine3.20
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /usr/src/app
COPY --from=builder --chown=appuser:appgroup /usr/src/app/node_modules ./node_modules
COPY --chown=appuser:appgroup . .
ENV NODE_ENV=production
ENV CHROME_BIN=/usr/bin/chromium-browser
ENV CHROME_PATH=/usr/lib/chromium/
USER appuser
EXPOSE 3000
CMD ["node", "server.js"]