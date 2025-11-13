# Overseer MCP Server Dockerfile
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (needed for TypeScript build)
RUN npm ci

# Copy source files
COPY tsconfig.json ./
COPY src ./src
COPY config ./config

# Build TypeScript
RUN npm run build

# Remove dev dependencies to reduce image size (optional)
RUN npm prune --production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port (if needed for HTTP transport in future)
# EXPOSE 3000

# Run the server
CMD ["node", "dist/server.js"]

