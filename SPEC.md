# shipwrkrs.dev Product Spec

Last updated: April 16, 2026

## Product goal

shipwrkrs.dev lets users go from idea to live Cloudflare Worker in minutes:

1. Describe behavior in plain English.
2. Generate Worker code with AI.
3. Review and edit code.
4. **See diff vs previous version when re-deploying.**
5. Deploy to `workers.dev` with full version history.
6. **Clone any deployed Worker via git.**

No CLI workflow is required for end users.

## Core user flow

1. User signs in with Cloudflare.
2. User writes a Worker description.
3. User selects model tier (free or premium).
4. App generates Worker code.
5. User reviews code and names Worker.
6. **If re-deploying: diff view shows changes vs previous version.**
7. App deploys Worker and returns live URL.
8. **Code is committed to Cloudflare Artifacts for version history.**
9. User can view deploy history, view code from any deploy, and clone Workers.

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
- **On every deploy: code is committed to Cloudflare Artifacts.**
- **Deploy history stores Artifact commit SHA and remote URL.**

### Diff view (re-deploys)

- When reviewing a Worker that already has a previous deploy, show diff toggle.
- Diff viewer supports unified (stacked) and split (side-by-side) modes.
- Uses @pierre/diffs library (built on Shiki for syntax highlighting).
- Fetches previous code from Artifacts via REST API.

### Clone Worker

- On deploy success: show "Clone this Worker" button.
- Clicking opens modal with git clone command.
- Clone URL includes short-lived read token (1 hour expiry).
- Copy button to copy full clone command.
- Tokens are minted on-demand, never stored.

### History and limits

- Persist deploy history per user.
- **History entries show Artifact availability indicator.**
- **View code action fetches code from Artifact commit via REST API.**
- **Uses read-only CodeMirror for viewing historical code.**
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
- `deploy_history` — deploy records with Artifact metadata

### Schema additions (v3)

```sql
-- Migration 0003_artifacts.sql
ALTER TABLE deploy_history ADD COLUMN artifact_remote TEXT;
ALTER TABLE deploy_history ADD COLUMN artifact_commit_sha TEXT;
```

### Indexes

- `idx_history_user_created` on `deploy_history(user_id, created_at DESC)`

## API surface

### Core routes

- Auth: `auth/login`, `auth/callback`, `auth/me`, `auth/logout`
- Generation: `generate`
- Deploy: `deploy`
- History: `history`
- Limits: `limits`

### Artifact routes

- `GET /api/artifacts/code?deployId={id}` — fetch code from Artifact commit
- `GET /api/artifacts/diff?scriptName={name}` — get previous code for diffing
- `POST /api/artifacts/token` — mint read token for clone URLs

## Non-functional requirements

- Fast interactive UX (low perceived latency, clear in-progress states).
- Reliable error handling for auth, generation, and deploy paths.
- Clear state transitions between Describe, Processing, Review, and Success.
- Mobile and desktop support.
- **Hero headings fade out after 5 seconds to reduce visual clutter.**

## Technical stack

- Frontend: Vue 3 + Vite + Bun
- Platform: Cloudflare Pages + Workers Functions
- Database: Cloudflare D1
- **Versioned storage: Cloudflare Artifacts**
- Editor: CodeMirror 6
- Diff viewer: @pierre/diffs (Shiki-based)
- UI foundation: shadcn-vue

## Development workflow

### Local dev

```bash
bun run dev          # Start both wrangler (8788) and vite (5173)
bun run dev:api      # API only
bun run dev:frontend # Frontend only
```

Note: AI binding and Artifacts binding are disabled in local dev. Use mock mode or premium tier with Anthropic key for generation.

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

## Security notes

- Artifact write tokens are used server-side only during deploy and discarded.
- Artifact read tokens are short-lived (1 hour), minted on-demand, never stored in D1.
- Clone URLs contain embedded tokens — they expire automatically.
