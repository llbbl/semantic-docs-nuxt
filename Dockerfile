# Production Dockerfile - Uses Turso database
# Automatically indexes content to Turso during build
# Multi-stage build with npm CVE elimination

# =============================================================================
# Base stage - Set up Corepack and prepare pnpm
# =============================================================================
FROM node:24-alpine AS base

WORKDIR /app

# Enable Corepack and install pnpm version from package.json
RUN corepack enable && \
    # Copy only package.json to read packageManager field
    COPY package.json ./

# Prepare pnpm using version from package.json
RUN corepack prepare "$(node -p "require('./package.json').packageManager")" --activate

# =============================================================================
# Dependencies stage - Install all dependencies
# =============================================================================
FROM base AS deps

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies with frozen lockfile for reproducibility
RUN pnpm install --frozen-lockfile

# =============================================================================
# Builder stage - Build the application
# =============================================================================
FROM base AS builder

# Build arguments for Turso credentials (required for indexing and pre-rendering)
ARG TURSO_DB_URL
ARG TURSO_AUTH_TOKEN
ARG EMBEDDING_PROVIDER=local

WORKDIR /app

# Re-enable Corepack in this stage
RUN corepack enable && \
    corepack prepare "$(node -p "require('./package.json').packageManager")" --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source files
COPY . .

# Set environment variables for build
ENV TURSO_DB_URL=$TURSO_DB_URL
ENV TURSO_AUTH_TOKEN=$TURSO_AUTH_TOKEN
ENV EMBEDDING_PROVIDER=$EMBEDDING_PROVIDER

# Index content to Turso database (env vars already set via ENV directives)
RUN pnpm exec tsx scripts/init-db.ts && pnpm exec tsx scripts/index-content.ts

# Build application (queries Turso database for static pre-rendering)
RUN pnpm build

# =============================================================================
# Production dependencies stage - Install only production dependencies
# =============================================================================
FROM base AS prod-deps

WORKDIR /app

# Re-enable Corepack in this stage
RUN corepack enable && \
    corepack prepare "$(node -p "require('./package.json').packageManager")" --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# =============================================================================
# Runner stage - Final production image with npm removed
# =============================================================================
FROM node:24-alpine AS runner

WORKDIR /app

# Enable Corepack and prepare pnpm (for potential runtime use)
COPY --from=base /app/package.json ./
RUN corepack enable && \
    corepack prepare "$(node -p "require('./package.json').packageManager")" --activate

# Remove npm and npx to eliminate CVEs while preserving Corepack
RUN rm -rf \
    /usr/local/lib/node_modules/npm \
    /usr/local/lib/node_modules/corepack/dist/npm*.js \
    /usr/local/lib/node_modules/corepack/dist/npx*.js \
    /usr/local/bin/npm \
    /usr/local/bin/npx \
    /opt/corepack/shims/npm \
    /opt/corepack/shims/npx 2>/dev/null || true

# Copy production dependencies
COPY --from=prod-deps /app/node_modules ./node_modules

# Copy built application from builder
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/local.db ./local.db

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S -u 1001 -G nodejs nuxt

# Change ownership
RUN chown -R nuxt:nodejs /app

# Switch to non-root user
USER nuxt

# Expose port
EXPOSE 3000

# Set environment variables
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the server
CMD ["node", ".output/server/index.mjs"]
