# syntax=docker/dockerfile:1.7
# Node 24 (not 26): the Google Cloud Storage client -> google-auth-library -> jws -> jwa ->
# buffer-equal-constant-time still calls buffer.SlowBuffer, which Node 25+ removed, so the
# service crashes at start-up on Node 26 (verified). Move to 26 once jwa drops that package.
ARG NODE_IMAGE=node:24.22.2-bookworm-slim

FROM ${NODE_IMAGE} AS prod-deps
# Chrome comes from Google's apt repository below, never from Puppeteer's download.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --no-audit --no-fund

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Google Chrome (the code launches /usr/bin/google-chrome) + tini as PID 1, which forwards
# SIGTERM and reaps the Chrome processes that are started per PDF request.
# wget/gnupg are only needed to add Google's apt repository and are purged again.
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
    rm -f /etc/apt/apt.conf.d/docker-clean \
  && apt-get update \
  && apt-get install -y --no-install-recommends wget gnupg ca-certificates \
  && wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
  && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] https://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends \
     google-chrome-stable \
     fonts-ipafont-gothic \
     fonts-wqy-zenhei \
     fonts-thai-tlwg \
     fonts-khmeros \
     fonts-kacst \
     fonts-freefont-ttf \
     libxss1 \
     dbus \
     dbus-x11 \
     tini \
  && apt-get purge -y --auto-remove wget gnupg

WORKDIR /usr/src/app
# The service used to run as root; it now runs as the image's unprivileged `node` user (UID 1000).
# winston writes ./logs (error.log, combined.log), so that directory must be writable.
RUN mkdir -p logs && chown node:node /usr/src/app logs
COPY --from=prod-deps --chown=node:node /usr/src/app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node server.js ./
COPY --chown=node:node src ./src

USER node
EXPOSE 3000
STOPSIGNAL SIGTERM

# /api/health needs the basic-auth pair the service already receives as API_USERNAME / API_PASSWORD.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "const a=Buffer.from((process.env.API_USERNAME||'')+':'+(process.env.API_PASSWORD||'')).toString('base64');fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health',{headers:{authorization:'Basic '+a}}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]
