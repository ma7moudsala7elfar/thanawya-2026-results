FROM ghcr.io/puppeteer/puppeteer:22

# Switch to root to install dependencies
USER root

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy source code
COPY . .

# The puppeteer image runs as pptruser
USER pptruser

EXPOSE 3001

CMD ["node", "backend/server.js"]
