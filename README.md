# shipwrkrs.dev

![shipwrkrs banner](./shipwrkrs-readme-logo.png)

Describe a Worker in plain English, generate code, review it, and deploy from one app.

## What this app does

- Sign in with Cloudflare
- Generate Worker code from a prompt
- Edit code in a live editor
- Deploy to `workers.dev`
- Track deploy history and usage limits

## Stack

- Vue 3 + Vite frontend
- Single Cloudflare Worker serving UI + API
- Cloudflare D1 for users, limits, and deploy history
- Workers AI (free tier) + optional Anthropic key (premium tier)

## Quick start (local)

1. Install dependencies

```bash
bun install
```

2. Build frontend assets

```bash
bun run build
```

3. Run the Worker locally

```bash
wrangler dev
```

## Database setup

Apply local migrations:

```bash
wrangler d1 migrations apply shipwrkrs-db --local
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

Choose one auth path:

- OAuth flow:
  - `CF_OAUTH_CLIENT_ID`
  - `CF_OAUTH_CLIENT_SECRET`
  - `CF_OAUTH_REDIRECT_URI`
- Server token fallback:
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

Set it to `"true"` to test full UI flow with mock auth/generate/deploy responses.

## Deploy

```bash
bun run deploy
```

Equivalent manual deploy:

```bash
bun run build
wrangler deploy
```
