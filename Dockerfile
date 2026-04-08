# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy configuration files
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application (Vite frontend + Server bundle)
RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Only copy necessary files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Expose the port (Cloud Run sets this via PORT env var)
EXPOSE 8080

# Start the application
CMD ["node", "dist/server.cjs"]
