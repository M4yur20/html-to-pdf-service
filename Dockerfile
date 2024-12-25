# Use the base Node.js image
FROM node:20.11.1 AS builder

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Install prerequisites and Google Chrome
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

# Ensure the path to Google Chrome is available for Puppeteer
RUN which google-chrome-stable || true

# Skip Chromium download and set the executable path for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true 
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Copy the application source code
COPY . .

# Expose the application port
EXPOSE 3000

# Define the default command
CMD ["node", "server.js"]
