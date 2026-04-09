# shipwrkrs.dev

Describe a Worker, generate code, deploy from browser.

## Run locally

```bash
bun install
bun run dev
```

For API routes + Pages Functions locally:

```bash
bun run build
wrangler pages dev dist
```

## Mock mode (full UI testing)

Mock mode is enabled by default in `wrangler.toml`:

```toml
[vars]
MOCK_MODE = "true"
```

In mock mode:
- `/api/auth/mock-login` creates a fake logged-in session
- `/api/generate` returns deterministic mock Worker code
- `/api/deploy` returns a mock `*.workers.dev` URL and logs history
- Limits + history are still backed by D1 so the full UX is testable

Click **Run full mock mode** on landing and run through all screens.

## D1

Apply migrations:

```bash
wrangler d1 migrations apply shipwrkrs-db --local
```

## Real Cloudflare auth/deploy config

Set env vars/secrets for real mode:

- `SESSION_SECRET` (random long string)
- `AUTH_ENCRYPTION_KEY` (base64url 32-byte key)
- `CF_OAUTH_CLIENT_ID`
- `CF_OAUTH_CLIENT_SECRET`
- `CF_OAUTH_REDIRECT_URI`
- `ANTHROPIC_API_KEY` (optional, premium tier)

OAuth login requests these scopes:

- `account:read`
- `user:read`
- `workers:write`

If OAuth is unavailable/misconfigured, fallback is **Set token once** on landing, which stores a user API token encrypted in D1.
