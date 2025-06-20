# Multi-stage build for VPConnect
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S vpconnect -u 1001

# Change ownership of the app directory
RUN chown -R vpconnect:nodejs /app
USER vpconnect

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); const options = { host: 'localhost', port: 5000, path: '/api/user', timeout: 2000 }; const request = http.request(options, (res) => { if (res.statusCode == 200) process.exit(0); else process.exit(1); }); request.on('error', () => process.exit(1)); request.end();"

# Start the application
CMD ["npm", "start"]