FROM node:20.11.1 AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production
RUN apt-get update \\
    && apt-get install -y wget gnupg \\
    && wget -q -O - <https://dl-ssl.google.com/linux/linux_signing_key.pub> | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \\
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] <https://dl-ssl.google.com/linux/chrome/deb/> stable main" > /etc/apt/sources.list.d/google.list \\
    && apt-get update \\
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-khmeros fonts-kacst fonts-freefont-ttf libxss1 dbus dbus-x11 \\
      --no-install-recommends \\
    && rm -rf /var/lib/apt/lists/*
RUN which google-chrome-stable || true
COPY . .
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true 
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
EXPOSE 3000
CMD ["node", "server.js"]