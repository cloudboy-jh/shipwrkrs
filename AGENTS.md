# Agent Context

## Project Overview

shipwrkrs.dev — Generate and deploy Cloudflare Workers from natural language prompts.

## Architecture

- **Frontend**: Vue 3 + Vite + TypeScript + Bun
- **Backend**: Cloudflare Pages Functions (single Worker)
- **Database**: Cloudflare D1 (SQLite)
- **AI**: Workers AI (free) / Anthropic (premium)

## Key Directories

```
functions/api/      # API routes
  auth/            # Session + API token connect flows
  _lib.ts          # Shared utilities
checks/            # Cloudflare Check files (if any)
migrations/        # D1 SQL migrations
src/               # Vue frontend
  components/      # UI components
  views/           # Page views
  composables/     # Vue composables
public/            # Static assets
dist/              # Build output (gitignored)
```

## Development

```bash
bun install
bun run dev      # Start both wrangler + vite
```

## Key Environment Variables

See README.md for full config. Essentials:
- `SESSION_SECRET`
- `AUTH_ENCRYPTION_KEY`
- `CF_DEPLOY_API_TOKEN`
- `ANTHROPIC_API_KEY` (optional, for premium tier)

## Database Schema

See `migrations/` for full schema. Key tables:
- `users` — user accounts
- `deploy_history` — deploys
- `rate_limits` — daily usage tracking

## Recent Major Changes (April 2026)

1. **Dev server** — Uses concurrently to run wrangler + vite together
2. **Hero fade** — Review heading fades out after 5 seconds

## Code Style

- Vue 3 Composition API with `<script setup>`
- TypeScript throughout
- shadcn-vue for UI primitives
- CSS custom properties for theming
