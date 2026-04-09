# shipwrkrs.dev — Product Spec

> Describe what you want. AI writes the Worker. One click deploy.

**Last updated:** April 8, 2026

---

## What it is

A fast, lightweight web UI for deploying Cloudflare Workers without touching wrangler, a terminal, or the Cloudflare dashboard. Users describe what they want in plain English, AI generates the Worker code, they review it, and deploy — all from the browser. Responsive enough to work on mobile, but designed for desktop-first usage.

## Why it exists

Deploying a Cloudflare Worker today requires: installing wrangler, writing a `wrangler.toml`, running CLI commands, or fighting the Cloudflare dashboard UI. For a platform that sells itself on simplicity, the deploy experience is anything but.

shipwrkrs makes the simplest possible path from idea to live Worker.

---

## Architecture

### Stack

- **Frontend:** Vue 3 + Vite + Bun
- **Hosting:** Cloudflare Pages (frontend) + Cloudflare Workers (API routes)
- **Auth:** Cloudflare OAuth 2.0 (users already need a CF account to deploy)
- **AI — Free tier:** Cloudflare Workers AI (`@cf/qwen/qwen2.5-coder-32b-instruct` for code gen)
- **AI — Premium:** Anthropic API (Claude Sonnet) via server-side Worker — user never touches an API key
- **State:** Cloudflare D1 (user sessions, deploy history, rate limit counters)
- **Editor:** CodeMirror 6 (mobile-friendly, lightweight, JS/TS syntax highlighting)
- **Deploy mechanism:** Cloudflare REST API (`PUT /accounts/{account_id}/workers/scripts/{script_name}`)

### System diagram

```
┌─────────────────────────────────────────────┐
│              shipwrkrs.dev                   │
│          (Cloudflare Pages — Vue 3)          │
└─────────────┬───────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│         API Worker (Cloudflare Workers)       │
│                                              │
│  /api/auth/*        Cloudflare OAuth flow    │
│  /api/generate      AI code generation       │
│  /api/deploy        Deploy to user's account │
│  /api/history       Deploy history (D1)      │
│  /api/limits        Rate limit status        │
└──────┬──────────┬───────────┬───────────────┘
       │          │           │
       ▼          ▼           ▼
   ┌───────┐  ┌────────┐  ┌──────────────────┐
   │  D1   │  │Workers │  │ Cloudflare API   │
   │       │  │  AI    │  │ (deploy to       │
   │Users  │  │  +     │  │  user's account) │
   │Limits │  │Anthropic│  │                  │
   │History│  │        │  │                  │
   └───────┘  └────────┘  └──────────────────┘
```

### Auth flow

1. User taps "Sign in with Cloudflare"
2. Redirect to Cloudflare OAuth consent screen
3. User grants `workers:write` + `account:read` scopes
4. Callback returns access token
5. Token stored in encrypted httpOnly cookie (session-based)
6. All subsequent API calls use this token to deploy to the user's own account

No API keys. No tokens to paste. One OAuth flow and they're in.

### AI code generation

Two tiers, same UX. User never knows which model is running unless they look.

**Free tier — Workers AI:**
- Model: `@cf/qwen/qwen2.5-coder-32b-instruct` (or best available code model)
- Called directly from the API Worker via `env.AI.run()`
- Zero additional cost — included in Workers free plan
- Rate limit: 10 generations/day per user

**Premium tier — Anthropic:**
- Model: Claude Sonnet (latest)
- Called server-side from API Worker — Anthropic API key is a Worker secret
- User never sees or provides an API key
- Jack pays the Anthropic bill (rate-limited to control costs)
- Rate limit: 5 generations/day per user (premium)

**System prompt for code gen:**

```
You are a Cloudflare Worker code generator.

Given a user's description, generate a complete, deployable Cloudflare Worker.

Rules:
- Output ONLY the Worker code, no explanation
- Use ES modules format (export default { async fetch(request, env, ctx) { ... } })
- Handle CORS if the worker serves an API
- Include appropriate error handling
- Use Web Standards APIs (fetch, Request, Response, URL, Headers)
- If the user mentions KV, R2, D1, or other bindings, include them but note they need manual setup
- Keep it minimal — no unnecessary dependencies
- Add a brief comment at the top describing what the worker does
```

### Deploy flow

1. Frontend sends generated code + user's desired script name to `/api/deploy`
2. API Worker uses the user's OAuth token to call:
   ```
   PUT https://api.cloudflare.com/client/v4/accounts/{account_id}/workers/scripts/{script_name}
   Content-Type: application/javascript
   
   {worker code}
   ```
3. On success, return the live URL: `https://{script_name}.{subdomain}.workers.dev`
4. Log deploy to D1 history table

### Rate limits

Stored in D1, keyed by Cloudflare user ID. Reset daily at 00:00 UTC.

| Action | Free limit |
|--------|-----------|
| AI generations (Workers AI) | 10/day |
| AI generations (Anthropic) | 5/day |
| Deploys | 20/day |

Rate limit status shown in the UI footer. No paid tier for now — revisit if there's demand.

---

## Design / Theme / Coloring

### Vibe

Cloudflare-inspired. Orange energy on dark. Feels native to the Cloudflare ecosystem without pretending to be an official product. Clean, fast, mobile-first. Developer tool energy but accessible enough that someone who's never used wrangler can figure it out.

### Color system

```css
:root {
  /* Backgrounds */
  --bg-primary:    #0a0a0a;       /* App background */
  --bg-surface:    #111111;       /* Cards, panels */
  --bg-elevated:   #1a1a1a;       /* Editor, input fields */
  --bg-hover:      #222222;       /* Hover states */
  
  /* Cloudflare orange */
  --cf-orange:     #f6821f;       /* Primary action, accents */
  --cf-orange-dim: #d4700f;       /* Hover state on orange */
  --cf-orange-glow: rgba(246, 130, 31, 0.15); /* Subtle glow */
  
  /* Text */
  --text-primary:  #e8e8e8;       /* Primary text */
  --text-secondary:#8b8b8b;       /* Labels, hints */
  --text-muted:    #555555;       /* Disabled, placeholders */
  
  /* Borders */
  --border:        #252525;       /* Default borders */
  --border-focus:  #f6821f;       /* Focused inputs */
  
  /* Status */
  --success:       #34d399;       /* Deploy success */
  --error:         #f87171;       /* Errors */
  --warning:       #fbbf24;       /* Warnings */
  
  /* Editor */
  --editor-bg:     #0d0d0d;       /* Code editor background */
  --editor-gutter: #1a1a1a;       /* Line numbers */
  --editor-line:   #141414;       /* Active line highlight */
}
```

### Spacing & Layout

Desktop-first, responsive down to mobile. Core flow maxes out at 720px centered. Editor can stretch wider on large screens (up to 960px). Standard tap targets for mobile compatibility but the primary experience is mouse + keyboard.

```css
:root {
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
  
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  
  --content-width: 720px;   /* core flow max width */
  --editor-width: 960px;    /* editor can go wider */
}
```

### Component style

- Buttons: Solid `--cf-orange` fill for primary, ghost/outline for secondary. No gradients. Subtle `box-shadow` with orange glow on primary CTA.
- Cards: `--bg-surface` with `1px solid --border`. No shadow. Slight border-radius.
- Inputs: `--bg-elevated` with `--border`, focus ring in `--cf-orange`.
- Editor: Near-black `--editor-bg`, distinct from app background. Minimal chrome around it.
- Status badges: Pill-shaped, color-coded (success/error/warning), small and unobtrusive.

---

## Typography

### Font stack

Not using the personal brutalist system. This is a Cloudflare-adjacent product — it should feel like developer tooling, clean and legible.

**Display / Headings:** `"Geist Sans"` (Vercel's open-source font — clean, geometric, excellent at display sizes, widely used in dev tooling). Fallback: `"SF Pro Display", -apple-system, sans-serif`.

**Body / UI:** `"Geist Sans"` at lighter weights. One font family keeps it cohesive and reduces load time on mobile.

**Code / Editor:** `"Geist Mono"` — monospaced companion to Geist Sans. Excellent for code. Fallback: `"SF Mono", "Fira Code", "Cascadia Code", monospace`.

### Type scale

```css
:root {
  --text-xs:   12px;   /* Badges, fine print */
  --text-sm:   14px;   /* Labels, secondary text */
  --text-base: 16px;   /* Body text (mobile readable) */
  --text-lg:   18px;   /* Section headers */
  --text-xl:   22px;   /* Page titles */
  --text-2xl:  28px;   /* Hero text */
  
  --weight-normal: 400;
  --weight-medium: 500;
  --weight-bold:   700;
  
  --leading-tight: 1.2;
  --leading-normal: 1.5;
  --leading-relaxed: 1.7;
}
```

### Loading

Fonts loaded via `<link rel="preload">` from Google Fonts CDN. Geist is available on Google Fonts. Critical: use `font-display: swap` so the page is usable immediately on slow mobile connections.

---

## User Journey (E2E)

### Screen 1: Landing / Sign in

**What the user sees:**

- shipwrkrs wordmark top-left
- One-liner: "Deploy Cloudflare Workers in seconds."
- Subtext: "Describe what you want. AI writes it. One click deploy."
- Single CTA button: **"Sign in with Cloudflare"** (orange, full-width on mobile)
- Below: small text — "Free • No API keys • Your account, your Workers"

**What happens:**

- Tap sign in → redirect to Cloudflare OAuth consent
- User approves `workers:write` + `account:read` scopes
- Redirect back to shipwrkrs → session cookie set → proceed to Screen 2

### Screen 2: Describe (the core screen)

**What the user sees:**

- Header: account indicator (Cloudflare email/name) + remaining generations badge
- Large text input (textarea, 4-5 lines visible, auto-expanding): placeholder "Describe your Worker..."
- Example prompts below the input (tappable, fill the textarea):
  - "A JSON API that returns a random quote"
  - "Redirect old URLs to new ones from a mapping"
  - "A proxy that adds CORS headers to any API"
  - "Return the current time in any timezone"
- Below examples: toggle for AI tier — "⚡ Fast (free)" vs "✨ Premium"
- CTA button: **"Generate Worker"** (orange, full-width)

**What happens:**

- User types or taps an example
- Tap Generate → loading spinner with "Writing your Worker..."
- API call to `/api/generate` with description + selected tier
- On success → transition to Screen 3

### Screen 3: Review + Deploy

**What the user sees:**

- Worker name input at top (auto-generated from description, editable): e.g. `random-quote-api`
- CodeMirror editor showing the generated code (JS syntax highlighting, dark theme matching app)
- Editor is editable — user can tweak if they want
- Below editor: the deploy target preview — `https://random-quote-api.{subdomain}.workers.dev`
- Two buttons:
  - **"Deploy"** (orange, primary)  
  - "Regenerate" (ghost/outline, secondary)
- Footer: deploy count remaining today

**What happens:**

- User reviews code, optionally edits
- Tap Deploy → loading state "Deploying..."
- API call to `/api/deploy` with code + script name + user's OAuth token
- On success → transition to Screen 4

### Screen 4: Success

**What the user sees:**

- Check icon (green `--success`)
- "Your Worker is live!"
- Live URL displayed as a tappable link: `https://random-quote-api.{subdomain}.workers.dev`
- "Copy URL" button
- "Test it" button (opens the URL in a new tab)
- "Deploy another" button (returns to Screen 2)

**What happens:**

- Deploy logged to D1 history
- User can copy URL, test it, or start over

### Screen 5: History (accessible from header menu)

**What the user sees:**

- List of previous deploys: script name, date, status (live/deleted), URL
- Tap any deploy to see the code that was deployed
- No delete/manage — that's what the CF dashboard is for

---

## Project structure

```
shipwrkrs/
├── src/
│   ├── App.vue
│   ├── main.ts
│   ├── router.ts
│   ├── views/
│   │   ├── Landing.vue          # Screen 1
│   │   ├── Describe.vue         # Screen 2
│   │   ├── Review.vue           # Screen 3
│   │   ├── Success.vue          # Screen 4
│   │   └── History.vue          # Screen 5
│   ├── components/
│   │   ├── CodeEditor.vue       # CodeMirror 6 wrapper
│   │   ├── Header.vue
│   │   ├── GenerationBadge.vue
│   │   └── ExamplePrompts.vue
│   ├── composables/
│   │   ├── useAuth.ts           # OAuth state management
│   │   ├── useGenerate.ts       # AI generation calls
│   │   └── useDeploy.ts         # Deploy calls
│   └── styles/
│       └── global.css           # CSS variables, base styles
├── functions/                   # Cloudflare Pages Functions (Workers)
│   └── api/
│       ├── auth/
│       │   ├── login.ts         # Initiate OAuth
│       │   └── callback.ts      # OAuth callback
│       ├── generate.ts          # AI code generation
│       ├── deploy.ts            # Deploy to user's account
│       ├── history.ts           # Deploy history (D1)
│       └── limits.ts            # Rate limit status
├── wrangler.toml
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## Build order

1. **Auth flow** — Cloudflare OAuth login/callback, session management
2. **Generate endpoint** — Workers AI code generation with system prompt
3. **Describe view** — textarea + example prompts + generate button
4. **Review view** — CodeMirror editor + deploy button
5. **Deploy endpoint** — Cloudflare API deploy + success view
6. **Rate limiting** — D1 counters, generation badge
7. **History** — D1 logging, history view
8. **Anthropic tier** — premium generation path
9. **Polish** — loading states, error handling, mobile edge cases

---

## Open questions

- **Cloudflare OAuth scopes:** Need to verify exact scope strings for Workers write access. May need to use API tokens flow instead of OAuth if CF doesn't expose a proper third-party OAuth for account access. Fallback: user pastes a CF API token on first use (one-time, stored encrypted in D1). Less elegant but proven.
- **Bindings:** If a user's Worker needs KV/R2/D1 bindings, those can't be set up via simple script upload. V1 ignores bindings — pure stateless Workers only. V2 could add binding setup.
- **Custom domains / routes:** V1 deploys to `*.workers.dev` only. Custom domains are a V2 feature.
- **Geist availability:** Confirm Geist Sans/Mono are on Google Fonts CDN. If not, self-host from Vercel's GitHub release or fall back to a similar geometric sans (e.g., `"Plus Jakarta Sans"`).