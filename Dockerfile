FROM node:20-slim

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy pre-built assets and configuration
COPY dist ./dist
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Expose the port (Cloud Run sets this via PORT env var)
EXPOSE 8080

# Start the application
CMD ["node", "dist/server.cjs"]
