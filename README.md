# shipwrkrs.dev

![shipwrkrs banner](./shipwrkrs-readme-logo.png)

Describe a Worker in plain English, generate code, review it, and deploy from one app.

## What this app does

- Connect your Cloudflare account with an API token
- Generate Worker code from a prompt (free tier: Workers AI, premium: Anthropic)
- Edit code in a live CodeMirror editor
- Deploy to `workers.dev`
- Track deploy history

## Stack

- Vue 3 + Vite + Bun frontend
- Single Cloudflare Worker serving UI + API
- Cloudflare D1 for users, limits, and deploy history
- Workers AI (free tier) + optional Anthropic key (premium tier)

## Quick start (local)

1. Install dependencies

```bash
bun install
```

2. Run both frontend and API dev servers

```bash
bun run dev
```

This starts:
- Wrangler dev server on port 8788 (API)
- Vite dev server on port 5173 (frontend with proxy)

Then open http://localhost:5173

Note: if Wrangler remote preview is blocked by Cloudflare Access in your account, use frontend-only mode (`bun run dev:frontend`) for UI e2e testing.

### Alternative: run separately

```bash
# Terminal 1: API only
bun run dev:api

# Terminal 2: Frontend only (sets VITE_FRONTEND_ONLY=true)
bun run dev:frontend
```

## Database setup

Apply local migrations:

```bash
bun run db:migrate
```

Apply remote migrations (before production deploy):

```bash
wrangler d1 migrations apply shipwrkrs-db --remote
```

## Configuration

Set these secrets/vars in your Worker environment.

Required:

- `SESSION_SECRET`
- `AUTH_ENCRYPTION_KEY` (base64url 32-byte key)

Auth model:

- User-provided Cloudflare API token (recommended):
  - Users paste token once in the app
  - Token is encrypted at rest in D1

Optional server fallback (single-owner mode):
- `CF_DEPLOY_API_TOKEN`
- `CF_DEPLOY_ACCOUNT_ID` (optional, auto-resolved when possible)

Optional:

- `ANTHROPIC_API_KEY` (premium generation tier)

## Mock mode

Mock mode is controlled in `wrangler.toml`:

```toml
[vars]
MOCK_MODE = "false"
```

Set it to `"true"` to test full API mock behavior.

For frontend-only testing without API, use `bun run dev:frontend` and enable the UI mock toggle on the landing page.

## Deploy

```bash
bun run deploy
```

Equivalent manual deploy:

```bash
bun run build
wrangler deploy
```

## Project structure

```
functions/api/        # API routes (Cloudflare Pages Functions)
  auth/             # Session + token connect + logout + me
  generate.ts       # AI code generation
  deploy.ts         # Worker deployment
  history.ts        # Deploy history
  limits.ts         # Usage limits
src/                  # Vue frontend
  components/       # UI components
    CodeEditor.vue      # CodeMirror editor
  views/            # Page views
    Describe.vue    # Prompt input
    Review.vue      # Code review + deploy
    History.vue     # Deploy history
migrations/           # D1 SQL migrations
  0001_init.sql
  0002_deploy_secret_names.sql
```
