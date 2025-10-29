# semantic-docs

Documentation theme with semantic vector search.

A beautiful, multi-theme documentation site built with Nuxt 3 and powered by [libsql-search](https://github.com/llbbl/libsql-search) for semantic search capabilities. Perfect for technical documentation, knowledge bases, and content-heavy sites.

## Features

- 🎨 **Multi-Theme UI** - 6 beautiful themes with CSS variables
- 🔍 **Semantic Search** - AI-powered vector search with ⌘K shortcut
- 📱 **Responsive** - Mobile-friendly with collapsible sidebar
- 📑 **Auto TOC** - Table of contents generated from headings
- 🚀 **Edge-Ready** - Optimized for Turso's global database with Nitro
- ⚡ **Fast** - Server-side rendering with Vue 3
- 🎯 **Type-Safe** - Full TypeScript support

## Quick Start

### 1. Clone or Use as Template

```bash
git clone https://github.com/llbbl/semantic-docs.git
cd semantic-docs
```

Or use as a template on GitHub.

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Set Up Environment

Copy `.env.example` to `.env` and add your credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```env
TURSO_DB_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-auth-token
EMBEDDING_PROVIDER=local
```

**Get Turso credentials:**

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Sign up and authenticate
turso auth signup

# Create a database
turso db create my-docs

# Get credentials
turso db show my-docs
```

### 4. Add Your Content

Create markdown files in `./content`:

```bash
mkdir -p content/getting-started
echo "# Hello World\n\nThis is my first article." > content/getting-started/intro.md
```

**Front matter support:**

```markdown
---
title: Getting Started
tags: [tutorial, beginner]
---

# Getting Started

Your content here...
```

### 5. Index Content

```bash
# Initialize database and index content to Turso
pnpm db:init
pnpm index

# Or use local database without Turso (for testing)
pnpm db:init:local
pnpm index:local
```

This will:
- Scan your markdown files
- Generate embeddings (using local model by default)
- Store everything in Turso (or local.db with `:local` commands)

### 6. Start Development

```bash
pnpm dev
```

Visit `http://localhost:3000` to see your docs!

## Customization

### Change Site Title

Edit `components/DocsHeader.vue`:

```vue
<span class="font-sans">Your Site Name</span>
```

And `layouts/default.vue`:

```vue
const title = "Your Site Name"
const description = "Your description"
```

### Customize Colors

The theme includes 6 pre-built color themes (dark, light, ocean, forest, sunset, purple). To customize or add themes, edit `config/themes.ts` and `assets/css/main.css`. Themes use CSS variables for easy customization.

### Change Embedding Provider

**Use Gemini** (free tier: 1,500 requests/day):

```env
EMBEDDING_PROVIDER=gemini
GEMINI_API_KEY=your-key
```

**Use OpenAI** (paid):

```env
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=your-key
```

## Project Structure

```
semantic-docs/
├── components/
│   ├── DocsHeader.vue          # Header with search
│   ├── DocsSidebar.vue         # Navigation sidebar
│   ├── DocsToc.vue             # Table of contents
│   ├── Search.vue              # Search modal
│   └── ThemeSwitcher.vue       # Theme selector
├── layouts/
│   └── default.vue             # Main layout
├── pages/
│   ├── [...slug].vue           # Article pages (catch-all)
│   └── index.vue               # Home page
├── server/
│   ├── api/
│   │   ├── search.post.ts      # Search API endpoint
│   │   ├── articles.get.ts     # All articles API
│   │   └── articles/[slug].get.ts # Single article API
│   └── utils/
│       ├── turso.ts            # Database client
│       ├── validation.ts       # Input validation
│       └── rateLimit.ts        # Rate limiting
├── scripts/
│   ├── index-content.ts        # Indexing script
│   └── init-db.ts              # Database initialization
├── config/
│   └── themes.ts               # Theme configurations
├── content/                    # Your markdown files
├── nuxt.config.ts
├── package.json
└── .env                        # Your credentials
```

## Deployment

### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
```

### Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod

# Add environment variables in Netlify dashboard
```

### Cloudflare Pages

```bash
# Build
pnpm build

# Deploy dist/ folder via Cloudflare dashboard
```

**Important:** Run `pnpm index` before building to ensure content is indexed.

## Content Organization

The theme automatically organizes content by folder:

```
content/
├── getting-started/
│   ├── intro.md
│   └── installation.md
├── guides/
│   ├── configuration.md
│   └── deployment.md
└── reference/
    └── api.md
```

Folders become collapsible sections in the sidebar.

## Search

The search bar in the header provides semantic search:

- **Semantic matching**: Finds content by meaning, not just keywords
- **Instant results**: Real-time as you type
- **Smart ranking**: Most relevant results first
- **Tag display**: Shows article tags in results

Try searching for concepts rather than exact phrases!

## Build for Production

```bash
# Index content
pnpm index

# Build site
pnpm build

# Preview
pnpm preview
```

## Troubleshooting

### Search not working

1. Check `.env` file has correct credentials
2. Verify Nuxt server is running with SSR enabled
3. Verify content is indexed: run `pnpm index`

### Content not showing

1. Run `pnpm index` to index your markdown files
2. Check content is in `./content` directory
3. Verify Turso database has data

### Local embedding model slow

First run downloads ~50MB model. Subsequent runs use cache.

Use Gemini for faster embeddings:

```env
EMBEDDING_PROVIDER=gemini
GEMINI_API_KEY=your-key
```

## Tech Stack

- **Framework**: [Nuxt](https://nuxt.com) 3
- **UI Framework**: [Vue](https://vuejs.org) 3
- **Search**: [libsql-search](https://github.com/llbbl/libsql-search)
- **Database**: [Turso](https://turso.tech) (libSQL)
- **Backend**: [Nitro](https://nitro.unjs.io) (Nuxt's server engine)
- **Styling**: [Tailwind CSS](https://tailwindcss.com) 4
- **Embeddings**: Xenova, Gemini, or OpenAI

## License

MIT

## Support

- [Issues](https://github.com/llbbl/semantic-docs/issues)
- [Discussions](https://github.com/llbbl/semantic-docs/discussions)

## Credits

Built with [libsql-search](https://github.com/llbbl/libsql-search).
