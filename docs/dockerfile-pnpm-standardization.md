# Dockerfile pnpm Standardization

## Overview

This document describes the Docker pnpm migration strategy implemented for the semantic-docs-nuxt project. The migration achieves three key objectives:

1. **Eliminate npm CVEs**: Remove npm and npx from production images while preserving Corepack
2. **Standardize on pnpm**: Align Docker builds with the project's pnpm-based development workflow
3. **Ensure reproducibility**: Use frozen lockfiles and version synchronization across all environments

## Architecture

### Multi-Stage Build Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                     node:24-alpine (base image)                      │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Stage 1: base                                                        │
│ - Enable Corepack                                                    │
│ - Read packageManager from package.json                              │
│ - Prepare pnpm dynamically                                           │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│ Stage 2: deps               │   │ Stage 4: prod-deps          │
│ - Copy package.json +       │   │ - Copy package.json +       │
│   pnpm-lock.yaml            │   │   pnpm-lock.yaml            │
│ - pnpm install              │   │ - pnpm install --prod       │
│   --frozen-lockfile         │   │   --frozen-lockfile         │
└─────────────────────────────┘   └─────────────────────────────┘
                    │                           │
                    ▼                           │
┌─────────────────────────────┐                 │
│ Stage 3: builder            │                 │
│ - Copy dependencies from    │                 │
│   deps stage                │                 │
│ - Copy source files         │                 │
│ - Initialize database       │                 │
│ - Index content             │                 │
│ - Build application         │                 │
└─────────────────────────────┘                 │
                    │                           │
                    └─────────────┬─────────────┘
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Stage 5: runner (final image)                                       │
│ - Copy package.json                                                  │
│ - Enable Corepack and prepare pnpm                                   │
│ - REMOVE npm and npx binaries                                        │
│ - Copy prod dependencies                                             │
│ - Copy build artifacts (.output, local.db)                           │
│ - Create non-root user                                               │
│ - Set security context                                               │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                    Production container ready
                    (npm CVEs eliminated)
```

### Stage Descriptions

#### Stage 1: base
**Purpose**: Foundation for all subsequent stages with pnpm version synchronization

**Key Operations**:
- Enable Corepack (Node.js package manager manager)
- Copy `package.json` to read `packageManager` field
- Dynamically prepare pnpm version specified in `package.json`

**Why**: Ensures all stages use the exact same pnpm version defined in `package.json`, eliminating version drift

#### Stage 2: deps
**Purpose**: Install all dependencies (dev + prod) for building

**Key Operations**:
- Copy `package.json` and `pnpm-lock.yaml`
- Run `pnpm install --frozen-lockfile`

**Why**: Separates dependency installation from source code copying for better layer caching

#### Stage 3: builder
**Purpose**: Build the Nuxt application with database initialization

**Key Operations**:
- Copy dependencies from `deps` stage
- Copy source files
- Initialize Turso database schema
- Index markdown content to database
- Build Nuxt application (SSR)

**Why**: Isolated build environment with all dev dependencies available

#### Stage 4: prod-deps
**Purpose**: Install only production dependencies (no devDependencies)

**Key Operations**:
- Copy `package.json` and `pnpm-lock.yaml`
- Run `pnpm install --prod --frozen-lockfile`

**Why**: Minimizes final image size by excluding dev dependencies (testing, linting, build tools)

#### Stage 5: runner
**Purpose**: Minimal production runtime with security hardening

**Key Operations**:
- Enable Corepack and prepare pnpm (for potential runtime use)
- **Remove npm/npx to eliminate CVEs**
- Copy production dependencies from `prod-deps`
- Copy build artifacts from `builder`
- Create non-root user (`nuxt:nodejs`)
- Configure health check

**Why**: Smallest possible attack surface while maintaining functionality

## Version Synchronization Strategy

### Single Source of Truth: package.json

The `packageManager` field in `package.json` is the **single source of truth** for pnpm version:

```json
{
  "packageManager": "pnpm@10.9.0"
}
```

### Synchronization Points

| Environment | Mechanism | Auto-detect? |
|-------------|-----------|--------------|
| **Dockerfile (all stages)** | `corepack prepare "$(node -p "require('./package.json').packageManager")" --activate` | ✅ Yes |
| **GitHub Actions CI** | `pnpm/action-setup@v4` with `run_install: false` | ✅ Yes |
| **Local Development** | Corepack reads `packageManager` field automatically | ✅ Yes |

### Why This Matters

**Problem Prevented**: Version drift between environments
- Developer uses pnpm 10.9.0 locally
- CI uses pnpm 10.0.0 (hardcoded)
- Docker uses pnpm 11.0.0 (latest)
- Result: Different lockfile resolutions, unexpected behavior

**Solution**: All environments read from `package.json`

### Updating pnpm Version

To update pnpm across all environments:

```bash
# Update package.json
npm pkg set packageManager=pnpm@10.10.0

# Update lockfile
pnpm install
```

No changes needed to Dockerfile or CI workflows - they auto-detect the new version.

## Security Rationale

### npm CVE Elimination

**Problem**: npm is bundled with Node.js and contains known CVEs that persist across Node versions.

**Solution**: Remove npm/npx from production images while preserving Corepack.

### What Gets Removed

```dockerfile
RUN rm -rf \
    /usr/local/lib/node_modules/npm \
    /usr/local/lib/node_modules/corepack/dist/npm*.js \
    /usr/local/lib/node_modules/corepack/dist/npx*.js \
    /usr/local/bin/npm \
    /usr/local/bin/npx \
    /opt/corepack/shims/npm \
    /opt/corepack/shims/npx 2>/dev/null || true
```

**Target Locations**:
- Core npm module directory
- Corepack npm/npx shims and distribution files
- npm/npx binaries

**Safe**: The `|| true` ensures the command succeeds even if some paths don't exist (varies by Node version).

### What Gets Preserved

- **Node.js runtime**: Fully functional for running applications
- **Corepack**: Package manager manager (enables pnpm, yarn)
- **pnpm**: Production package manager (if needed at runtime)

### Security Benefits

1. **Attack Surface Reduction**: Eliminates npm CVEs from production images
2. **Compliance**: Removes vulnerable packages that trigger security scanners
3. **Best Practice**: Production images should only contain what's needed to run

### Additional Security Measures

**Non-root User**:
```dockerfile
RUN addgroup -g 1001 -S nodejs && \
    adduser -S -u 1001 -G nodejs nuxt
USER nuxt
```

**Frozen Lockfiles**:
```dockerfile
RUN pnpm install --frozen-lockfile
```
Prevents supply chain attacks via unexpected dependency updates.

**Health Check**:
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
```
Enables container orchestration platforms to detect failures.

## Registry Configuration

### Strategy Applied: Strategy B (No Registry Override)

**Detection Result**: No custom registry configuration found in `.npmrc` or `.pnpmrc`

**Implementation**: Standard pnpm installation without registry overrides

**What This Means**:
- Project uses the public npm registry (`https://registry.npmjs.org/`)
- No custom corporate or test registries configured
- No registry override steps needed in Dockerfile or CI workflows

### If You Need Custom Registry Override (Future)

If you later add a custom registry (e.g., corporate proxy, Verdaccio), follow **Strategy A**:

**For Dockerfile**, add before each `pnpm install`:
```dockerfile
RUN echo "registry=https://registry.npmjs.org/" > .npmrc && \
    npm config set registry https://registry.npmjs.org/ && \
    pnpm config set registry https://registry.npmjs.org/ && \
    pnpm install --frozen-lockfile
```

**For GitHub Actions**, add TWO steps:
```yaml
# BEFORE pnpm installation
- name: Configure npm registry for CI
  run: |
    echo "registry=https://registry.npmjs.org/" > .npmrc
    npm config set registry https://registry.npmjs.org/

- name: Install pnpm
  uses: pnpm/action-setup@v4
  with:
    run_install: false

# AFTER pnpm installation
- name: Configure pnpm registry
  run: pnpm config set registry https://registry.npmjs.org/
```

**Why Two Steps?**: `pnpm/action-setup` reads `.npmrc` during its own installation. Custom registries must be overridden before and after.

## Manual Verification

### Verify npm Removal

Build the image and check for npm:

```bash
# Build the image
docker build -t semantic-docs-test .

# Check if npm exists (should return error)
docker run --rm semantic-docs-test npm --version
# Expected: "executable file not found" or similar

# Check if npx exists (should return error)
docker run --rm semantic-docs-test npx --version
# Expected: "executable file not found" or similar

# Check if node exists (should work)
docker run --rm semantic-docs-test node --version
# Expected: v24.x.x

# Check if pnpm exists (should work)
docker run --rm semantic-docs-test pnpm --version
# Expected: 10.9.0
```

### Verify pnpm Version Synchronization

```bash
# Check package.json packageManager field
cat package.json | grep packageManager
# Expected: "packageManager": "pnpm@10.9.0"

# Check version in running container
docker run --rm semantic-docs-test pnpm --version
# Expected: 10.9.0 (must match package.json)

# Check CI workflow auto-detection
cat .github/workflows/ci.yml | grep -A2 "pnpm/action-setup"
# Expected: run_install: false (auto-detects from package.json)
```

### Verify Frozen Lockfile Usage

```bash
# Search Dockerfile for frozen-lockfile flag
grep "frozen-lockfile" Dockerfile
# Expected: Multiple lines with --frozen-lockfile

# Verify .dockerignore doesn't block lockfile
grep "pnpm-lock.yaml" .dockerignore
# Expected: Comment line only, not ignored
```

### Verify Multi-Stage Build

```bash
# Check stage names
grep "^FROM.*AS" Dockerfile
# Expected output:
# FROM node:24-alpine AS base
# FROM base AS deps
# FROM base AS builder
# FROM base AS prod-deps
# FROM node:24-alpine AS runner
```

### Verify Image Size Reduction

```bash
# Build and check image size
docker build -t semantic-docs-test .
docker images semantic-docs-test

# Compare layer sizes
docker history semantic-docs-test
# Should show small final layer (only prod deps + artifacts)
```

### Verify Application Functionality

```bash
# Run the container with environment variables
docker run --rm -p 3000:3000 \
  -e TURSO_DB_URL="your-db-url" \
  -e TURSO_AUTH_TOKEN="your-token" \
  semantic-docs-test

# In another terminal, test the endpoints
curl http://localhost:3000/
curl http://localhost:3000/api/articles

# Check health endpoint
curl http://localhost:3000/
# Should return HTML (status 200)
```

## Troubleshooting

### Issue: Build fails with "pnpm: not found"

**Symptoms**:
```
pnpm install --frozen-lockfile
/bin/sh: pnpm: not found
```

**Cause**: Corepack not enabled or pnpm not prepared

**Solution**: Ensure each stage that uses pnpm includes:
```dockerfile
RUN corepack enable && \
    corepack prepare "$(node -p "require('./package.json').packageManager")" --activate
```

### Issue: Build fails with "lockfile is out of date"

**Symptoms**:
```
ERR_PNPM_OUTDATED_LOCKFILE  Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up to date
```

**Cause**: `pnpm-lock.yaml` doesn't match `package.json`

**Solution**:
```bash
# Regenerate lockfile locally
pnpm install

# Commit the updated lockfile
git add pnpm-lock.yaml
git commit -m "chore: update pnpm lockfile"
```

### Issue: .dockerignore blocks pnpm-lock.yaml

**Symptoms**: Build succeeds but uses different dependency versions

**Cause**: `.dockerignore` contains `pnpm-lock.yaml`, preventing it from being copied

**Solution**: Remove or comment out the line:
```diff
  # Dependencies
  node_modules/
- pnpm-lock.yaml
+ # pnpm-lock.yaml must NOT be ignored (needed for --frozen-lockfile)
```

### Issue: package.json missing packageManager field

**Symptoms**: Build fails or uses wrong pnpm version

**Cause**: `package.json` doesn't have `packageManager` field

**Solution**: Add to `package.json`:
```json
{
  "packageManager": "pnpm@10.9.0"
}
```

### Issue: GitHub Actions uses wrong pnpm version

**Symptoms**: CI passes locally but fails in GitHub Actions

**Cause**: Workflow hardcodes pnpm version instead of auto-detecting

**Solution**: Update workflow to use `run_install: false`:
```yaml
- name: Setup pnpm
  uses: pnpm/action-setup@v4
  with:
    run_install: false  # Auto-detects from package.json
```

### Issue: "npm not found" errors in production

**Symptoms**: Application logs show `npm: command not found`

**Cause**: Application code calls npm directly (should use pnpm or node)

**Solution**: Search codebase for npm usage:
```bash
grep -r "npm run" .
grep -r "npm install" .
```
Replace with pnpm equivalents or direct node execution.

**Note**: This should NOT happen in this project - all scripts use pnpm.

### Issue: Permission denied errors

**Symptoms**:
```
EACCES: permission denied, mkdir '/app/.nuxt'
```

**Cause**: Files owned by root but running as non-root user

**Solution**: Ensure proper ownership before USER directive:
```dockerfile
RUN chown -R nuxt:nodejs /app
USER nuxt
```

### Issue: Database file not found in production

**Symptoms**: Application fails to start, logs show database errors

**Cause**: `local.db` not copied from builder stage

**Solution**: Verify Dockerfile copies database:
```dockerfile
COPY --from=builder /app/local.db ./local.db
```

### Issue: Health check fails

**Symptoms**: Container marked unhealthy in orchestration platforms

**Cause**: Application not responding on expected port

**Solution**:
1. Check PORT environment variable matches EXPOSE directive (3000)
2. Verify application binds to `0.0.0.0` (not `localhost`)
3. Test manually:
   ```bash
   docker run -p 3000:3000 semantic-docs-test
   curl http://localhost:3000/
   ```

## Build Arguments Reference

### Required for Production Deployment

| Argument | Description | Example |
|----------|-------------|---------|
| `TURSO_DB_URL` | Turso database URL | `libsql://your-db.turso.io` |
| `TURSO_AUTH_TOKEN` | Turso authentication token | `eyJ...` |

### Optional

| Argument | Description | Default |
|----------|-------------|---------|
| `EMBEDDING_PROVIDER` | Embedding provider for semantic search | `local` |

### Build Command Example

```bash
docker build \
  --build-arg TURSO_DB_URL="libsql://your-db.turso.io" \
  --build-arg TURSO_AUTH_TOKEN="your-token" \
  --build-arg EMBEDDING_PROVIDER="local" \
  -t semantic-docs-nuxt:latest \
  .
```

## CI/CD Integration

### GitHub Actions Workflow Structure

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '24'

- name: Setup pnpm
  uses: pnpm/action-setup@v4
  with:
    run_install: false  # Auto-detects version from package.json

- name: Install dependencies
  run: pnpm install

- name: Run tests
  run: pnpm test --run

- name: Build
  run: pnpm build
```

**Key Points**:
- Node.js 24 matches Dockerfile base image
- `run_install: false` enables auto-detection
- No registry override needed (Strategy B)

## Migration Checklist

- [x] Add `packageManager` field to `package.json`
- [x] Update `.dockerignore` to preserve `pnpm-lock.yaml`
- [x] Rewrite `Dockerfile` with multi-stage build
- [x] Remove npm/npx in runner stage
- [x] Update GitHub Actions to auto-detect pnpm version
- [x] Update Node.js version to 24 in all environments
- [x] Use `--frozen-lockfile` in all install commands
- [x] Document architecture and security rationale
- [x] Verify npm removal in built images
- [x] Test application functionality post-migration

## References

- [Corepack Documentation](https://nodejs.org/api/corepack.html)
- [pnpm Documentation](https://pnpm.io/)
- [Docker Multi-Stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [GitHub Actions pnpm Setup](https://github.com/pnpm/action-setup)
- [OWASP Container Security](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)

## Maintenance

### When to Update This Document

- pnpm version changes
- Docker base image version changes
- Security hardening measures added
- Registry configuration changes (Strategy A implementation)
- Troubleshooting steps discovered

### Ownership

**Maintained by**: Development Team
**Last Updated**: 2025-11-19
**Migration Completed**: 2025-11-19
