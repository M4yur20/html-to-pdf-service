FROM node:20.11.1 AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true 
RUN apt-get update && apt-get install -y wget gnupg curl \
  && wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
  && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] https://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google.list \
  && apt-get update \
  && apt-get install -y google-chrome-stable \
     fonts-ipafont-gothic \
     fonts-wqy-zenhei \
     fonts-thai-tlwg \
     fonts-khmeros \
     fonts-kacst \
     fonts-freefont-ttf \
     libxss1 \
     dbus \
     dbus-x11 \
     --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*
RUN which google-chrome-stable || true
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
