# shipwrkrs.dev Product Spec

Last updated: April 16, 2026

## Product goal

shipwrkrs.dev lets users go from idea to live Cloudflare Worker in minutes:

1. Describe behavior in plain English.
2. Generate Worker code with AI.
3. Review and edit code.
4. Deploy to `workers.dev`.

No CLI workflow is required for end users.

## Core user flow

1. User signs in with Cloudflare.
2. User writes a Worker description.
3. User selects model tier (free or premium).
4. App generates Worker code.
5. User reviews code and names Worker.
6. App deploys Worker and returns live URL.
7. User can view deploy history.

## Functional requirements

### Authentication

- Primary sign-in path is Cloudflare sign-in.
- Auth session is cookie-based.
- Signed-in user identity is available in header/account UI and API routes.

### Generation

- Free tier uses Workers AI.
- Premium tier uses Anthropic server-side.
- Output must be deployable Worker code (ES module format).
- Empty or failed model responses return a clear error.

### Deploy

- Deploy takes script name + code and publishes to Cloudflare Workers.
- Script name must be normalized and validated.
- Successful deploy returns canonical `workers.dev` URL.
- Failed deploy returns actionable error messaging.

### History and limits

- Persist deploy history per user.
- Persist and enforce daily generation/deploy limits per user.
- Reset counters daily at UTC boundary.

### Examples

- Provide categorized example prompts.
- One click should populate the describe prompt and continue flow.

## Data model (D1)

### Tables

- `users` — user identity and profile
- `user_tokens` — encrypted API tokens
- `rate_limits` — daily usage counters
- `deploy_history` — deploy records

### Schema

See `migrations/` folder for full schema.

### Indexes

- `idx_history_user_created` on `deploy_history(user_id, created_at DESC)`

## API surface

Key routes under `functions/api`:

- Auth: `auth/login`, `auth/callback`, `auth/me`, `auth/logout`
- Generation: `generate`
- Deploy: `deploy`
- History: `history`
- Limits: `limits`

## Non-functional requirements

- Fast interactive UX (low perceived latency, clear in-progress states).
- Reliable error handling for auth, generation, and deploy paths.
- Clear state transitions between Describe, Processing, Review, and Success.
- Mobile and desktop support.
- Hero headings fade out after 5 seconds to reduce visual clutter.

## Technical stack

- Frontend: Vue 3 + Vite + Bun
- Platform: Cloudflare Pages + Workers Functions
- Database: Cloudflare D1
- Editor: CodeMirror 6
- UI foundation: shadcn-vue

## Development workflow

### Local dev

```bash
bun run dev          # Start both wrangler (8788) and vite (5173)
bun run dev:api      # API only
bun run dev:frontend # Frontend only
```

Note: AI binding is configured but may have limitations in local dev. Use mock mode or premium tier with Anthropic key for testing generation.

### Build and deploy

```bash
bun run build        # Build frontend
bun run check        # Type check
bun run deploy       # Build + deploy to Cloudflare
```

## Out of scope

- Managing Cloudflare account billing or org administration.
- Building a full Workers dashboard replacement.
- Arbitrary multi-provider deployment targets outside Cloudflare Workers.
