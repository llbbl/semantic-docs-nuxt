# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**semantic-docs** is a Nuxt 3 documentation theme with semantic vector search powered by libsql-search. It combines server-side rendering with Vue components and Nitro API routes using Turso (libSQL) for edge-optimized semantic search capabilities.

## Essential Commands

### Development
```bash
# Install dependencies
pnpm install

# Start dev server (runs on http://localhost:3000)
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

### Content Management
```bash
# Turso (default - requires .env with credentials)
pnpm db:init    # Initialize Turso database schema
pnpm index      # Index markdown content to Turso

# Local libSQL (for CI/testing - no .env required)
pnpm db:init:local   # Initialize local database (file:local.db)
pnpm index:local     # Index to local database

# Run tests
pnpm test

# Linting and formatting
pnpm lint       # Check code with Biome
pnpm lint:fix   # Auto-fix issues
pnpm format     # Format all files
```

**Important:**
- Always run `pnpm index` (or `pnpm index:local`) after adding/modifying content in `./content` directory before building.
- Use `db:init` and `index` for production with Turso (loads `.env` file)
- Use `db:init:local` and `index:local` for CI/local testing without Turso credentials
- The dev server (`pnpm dev`) works with either database type

## Architecture

### Content Flow
1. **Markdown → Database**: Content in `./content` is indexed into Turso via `scripts/index-content.ts`
2. **libsql-search**: Handles embedding generation (local/Gemini/OpenAI), vector storage, and semantic search
3. **Server-Side Rendering**: Article pages are server-rendered using Nuxt's dynamic routing
4. **Server API**: Search API runs on Nitro backend at `/api/search`

### Key Components
- **Search.vue**: Client-side search UI with debounced API calls (300ms), displays results in modal
- **DocsHeader.vue**: Header with embedded search component
- **DocsSidebar.vue**: Navigation sidebar built from folder structure in database
- **DocsToc.vue**: Auto-generated table of contents from article headings
- **ThemeSwitcher.vue**: Multi-theme selector with 6 color themes
- **pages/[...slug].vue**: Dynamic article pages using Nuxt's catch-all routing

### Database Integration
- **server/utils/turso.ts**: Singleton client wrapper, re-exports libsql-search utilities
- **scripts/init-db.ts**: Initializes database schema with vector search support
- **scripts/index-content.ts**: Indexes markdown files, creates table with 768-dimension vectors
- All content queries use functions from libsql-search: `getAllArticles()`, `getArticleBySlug()`, `getArticlesByFolder()`, `getFolders()`

### Environment Variables
Optional in `.env`:
- `TURSO_DB_URL`: Turso database URL (libsql://...) - if not set, uses local libSQL file
- `TURSO_AUTH_TOKEN`: Turso authentication token - if not set, uses local libSQL file
- `EMBEDDING_PROVIDER`: "local" (default), "gemini", or "openai"
- Optional: `GEMINI_API_KEY` or `OPENAI_API_KEY` (if using cloud providers)

**Local Development**: If Turso credentials aren't provided, the project automatically falls back to a local SQLite file (`local.db`) for database operations. This is useful for CI builds and local development without cloud dependencies.

## Critical Configuration

### Nuxt Server-Side Rendering
The search API endpoint runs on Nuxt's Nitro server. The configuration uses:
- Nuxt 3's built-in SSR capabilities with Nitro backend
- API routes in `server/api/` directory auto-registered as endpoints
- Server utilities in `server/utils/` for database and validation logic
- Pages are server-rendered by default with Vue 3

The Nitro server handles all API requests and provides edge-ready deployment options.

### Content Structure
Content in `./content` must follow this pattern:
```
content/
├── folder-name/
│   └── article.md
```

Folders become sidebar sections. Each markdown file can have optional frontmatter:
```markdown
---
title: Article Title
tags: [tag1, tag2]
---
```

### Routing
- Article pages (`pages/[...slug].vue`): Dynamic catch-all route for all article paths
- Search API (`server/api/search.post.ts`): Nitro API endpoint handling POST requests
- Articles API (`server/api/articles.get.ts`): Returns all articles for sidebar navigation
- Individual article API (`server/api/articles/[slug].get.ts`): Returns single article by slug

## Integration Points

### Adding New libsql-search Features
The project relies heavily on libsql-search. When modifying search behavior:
1. Check libsql-search documentation for available options
2. Update `scripts/index-content.ts` for indexing changes
3. Update `server/api/search.post.ts` for search query changes
4. Maintain embedding dimension consistency (768) across indexing and search

### Customizing Embedding Providers
To switch providers, update `.env` and ensure API keys are set. The dimension (768) must match across:
- `scripts/index-content.ts` (createTable and indexContent)
- Search API (automatically uses same provider)
- Re-index content after switching providers

### Styling
- Uses Tailwind CSS 4 via Vite plugin
- RGB hex colors for maximum browser compatibility
- CSS variables defined in global.css for theming
- Multi-theme system with 6 pre-built themes (dark, light, ocean, forest, sunset, purple)
- ThemeSwitcher component allows runtime theme changes
- Complementary colors for sidebar (darker) and TOC (lighter) in each theme

### Security & Rate Limiting
- In-memory rate limiting on search API: 20 requests per minute per IP
- Query length validation: 500 character maximum
- Results limit enforcement: 1-20 results
- Standard rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)
- See `docs/SECURITY.md` for comprehensive security considerations