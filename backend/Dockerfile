# ==========================================
# FinderSpot Full-Stack Production Container
# ==========================================

FROM node:20-alpine

# Set working directory inside container
WORKDIR /app

# Install curl for Docker healthcheck
RUN apk --no-cache add curl

# Copy dependency definition files
COPY backend/package*.json ./backend/

# Install only production dependencies
WORKDIR /app/backend
RUN npm ci --omit=dev

# Return to root app directory
WORKDIR /app

# Copy backend application and frontend static files
COPY backend ./backend
COPY frontend ./frontend

# Switch back to backend directory for server runtime
WORKDIR /app/backend

# Ensure uploads directory exists
RUN mkdir -p uploads

# Expose backend application port
EXPOSE 5000

# Container healthcheck monitoring endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Start the application
CMD ["node", "server.js"]
