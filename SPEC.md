# shipwrkrs.dev — Product Spec

> Describe what you want. AI writes the Worker. One click deploy.

**Last updated:** April 10, 2026

---

## What it is

A fast web UI for deploying Cloudflare Workers without wrangler, a terminal, or the Cloudflare dashboard. Users describe what they want in plain English, AI generates the Worker code, they review it, and deploy — all from the browser.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Vue 3 + Vite + Bun |
| Hosting | Cloudflare Pages (frontend) + Cloudflare Workers (API) |
| Auth | Cloudflare OAuth 2.0 |
| AI (free) | Cloudflare Workers AI — `@cf/qwen/qwen2.5-coder-32b-instruct` |
| AI (premium) | Anthropic Claude Sonnet — server-side, user never touches a key |
| State | Cloudflare D1 — sessions, deploy history, rate limit counters |
| Editor | CodeMirror 6 — JS/TS syntax highlighting, oneDark theme |
| UI primitives | shadcn-vue (real CLI-installed components) |
| Tailwind | Tailwind CSS v4 via `@tailwindcss/vite` |
| Icons | lucide-vue-next |
| Path alias | `@` → `src/` (configured in vite.config.ts + tsconfig) |

---

## Design system

### Fonts

- **Headings / UI labels:** `'DM Sans', sans-serif` — weight 700 or 800 only
- **Code / mono / metadata:** `'IBM Plex Mono', monospace` — weight 500, 600, or 700 only
- **Rule: minimum font weight is 500 everywhere. No thin text.**

Loaded in `index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600;700&family=DM+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">
```

### CSS variables (`src/styles/global.css`)

```css
:root {
  --o:   #f25706;                    /* primary orange */
  --od:  #d94d05;                    /* orange hover/dark */
  --og:  rgba(242, 87, 6, 0.18);     /* orange glow */
  --bg:  #09090b;                    /* app background */
  --sf:  #0f1012;                    /* surface (cards, panels) */
  --el:  #18191c;                    /* elevated (inputs, rows) */
  --tx:  #ececef;                    /* primary text */
  --t2:  #9a9ba3;                    /* secondary text */
  --tm:  #56575e;                    /* muted text */
  --bd:  #222328;                    /* borders */
  --gn:  #34d399;                    /* success green */
  --er:  #f87171;                    /* error red */
  --topbar-h: 68px;                  /* fixed header height */
  --mono: 'IBM Plex Mono', monospace;
  --sans: 'DM Sans', sans-serif;
}
```

Light theme is applied via `[data-theme="light"]` on `<html>`. Tokens in `src/styles/tailwind.css` map to shadcn-vue's expected color names.

### Tailwind CSS variables (`src/styles/tailwind.css`)

Tailwind v4 `@theme` block maps project tokens to shadcn-expected names:

```
--color-primary        → #f25706 (orange)
--color-background     → #09090b
--color-foreground     → #ececef
--color-muted          → --el equivalent
--color-border         → --bd equivalent
--color-secondary      → --el equivalent
--color-accent         → slightly lighter than --el for hover
```

Light theme lives in `[data-theme="light"]` block.

---

## UI component rules

### shadcn-vue components (installed via CLI)

Use these — do not hand-roll alternatives:

| Component | Import path |
|---|---|
| Button | `@/components/ui/button` |
| Badge | `@/components/ui/badge` |
| Tabs / TabsList / TabsTrigger / TabsContent | `@/components/ui/tabs` |
| ScrollArea | `@/components/ui/scroll-area` |
| Separator | `@/components/ui/separator` |

All shadcn components are overridden to use project design tokens via Tailwind arbitrary value syntax in the CVA strings — never raw CSS class appending.

### Custom UI patterns (not shadcn — used in scoped styles)

**Prompt block** — dark surface container with orange glow line:
```css
.prompt-block {
  background: var(--sf);
  border: 1px solid var(--bd);
  border-radius: 16px;
  overflow: hidden;
  position: relative;
}
.prompt-block::before {
  content: '';
  position: absolute;
  top: -1px; left: 20%; right: 20%;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--o), transparent);
  opacity: 0.4;
}
```

**Toolbar** — bottom bar inside a block:
```css
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-top: 1px solid var(--bd);
  background: rgba(255,255,255,0.01);
}
```

**Primary button** (scoped, used in views that don't use shadcn Button):
```css
.btn-primary {
  height: 40px; padding: 0 28px;
  background: var(--o); color: #000;
  border: none; border-radius: 10px;
  font-family: var(--sans); font-size: 14px; font-weight: 700;
  box-shadow: 0 0 0 1px var(--og), 0 4px 16px var(--og);
}
```

**Ghost button:**
```css
.btn-ghost {
  height: 40px; padding: 0 20px;
  background: transparent; color: var(--t2);
  border: 1px solid var(--bd); border-radius: 10px;
  font-family: var(--sans); font-size: 14px; font-weight: 600;
}
```

**Page layout wrappers:**
```css
.page-center {
  min-height: calc(100vh - var(--topbar-h));
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
}

.page-top {
  min-height: calc(100vh - var(--topbar-h));
  display: flex; justify-content: center;
  padding: 80px 24px 48px;
}
```

### Button variants (shadcn Button overrides)

| Variant | Style |
|---|---|
| `default` | Orange bg, black text, DM Sans 700, `rounded-[10px]`, orange glow shadow |
| `outline` | Transparent, `border-border`, muted text, accent hover |
| `secondary` | `bg-secondary`, `border-border` |
| `ghost` | Transparent, no border, muted text, accent hover |

### Tabs overrides

- `TabsList` — `bg-[var(--el)]`, `border-[var(--bd)]`, `rounded-xl`
- `TabsTrigger` — inactive: `text-[var(--t2)]`, IBM Plex Mono; active: `bg-[var(--o)]`, black text, bold

---

## App structure

```
shipwrkrs/
├── src/
│   ├── App.vue                      # Shell: header + RouterView + sonner
│   ├── main.ts                      # App init, imports global.css + tailwind.css
│   ├── router.ts                    # All routes with meta.width
│   ├── env.d.ts
│   ├── shipwrkrs-logomain (1).png   # Logo asset
│   ├── views/
│   │   ├── Landing.vue              # Sign in + mock mode
│   │   ├── Describe.vue             # Prompt input + generate
│   │   ├── Processing.vue           # AI thinking state (between Describe → Review)
│   │   ├── Review.vue               # Code editor + deploy + step log
│   │   ├── Success.vue              # Worker live confirmation
│   │   ├── History.vue              # Deploy history feed
│   │   └── Examples.vue            # Worker example catalog (tabs + feed list)
│   ├── components/
│   │   ├── Header.vue               # Fixed topbar: logo, nav, theme toggle, avatar
│   │   ├── CodeEditor.vue           # CodeMirror 6 wrapper (do not modify)
│   │   ├── DeployStepLog.vue        # Stepped deploy progress component
│   │   └── ui/
│   │       ├── button/              # shadcn Button (overridden variants)
│   │       ├── badge/               # shadcn Badge
│   │       ├── tabs/                # shadcn Tabs (overridden active state)
│   │       ├── scroll-area/         # shadcn ScrollArea
│   │       ├── separator/           # shadcn Separator
│   │       ├── Dialog.vue           # Custom dialog (used for stats + token fallback)
│   │       ├── Sonner.vue           # Toast renderer
│   │       └── sonner.ts            # Toast state composable
│   ├── composables/
│   │   ├── api.ts                   # Fetch wrapper + full mock mode implementation
│   │   ├── useAuth.ts               # Auth state, OAuth, token save, logout
│   │   ├── useGenerate.ts           # AI generation API call
│   │   ├── useDeploy.ts             # Deploy API call
│   │   ├── useFlowState.ts          # Shared state: description, code, scriptName, deployedUrl
│   │   └── useMeta.ts               # Rate limit/stats fetch
│   ├── lib/
│   │   └── utils.ts                 # cn() helper (clsx + tailwind-merge)
│   └── styles/
│       ├── global.css               # CSS variables, base styles, dialog/toast styles
│       └── tailwind.css             # Tailwind v4 @theme + light theme override
├── functions/                       # Cloudflare Pages Functions (do not modify)
│   └── api/
│       ├── auth/login.js
│       ├── auth/callback.js
│       ├── auth/me.js
│       ├── auth/logout.js
│       ├── auth/token.js
│       ├── generate.js + generate.ts
│       ├── deploy.js + deploy.ts
│       ├── history.js + history.ts
│       └── limits.js + limits.ts
├── migrations/                      # D1 schema (do not modify)
├── components.json                  # shadcn-vue CLI config
├── opencode.md                      # Agent rules
├── SPEC.md                          # This file
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── wrangler.toml
└── package.json
```

---

## Routes

| Path | View | Width | Layout |
|---|---|---|---|
| `/` | Landing.vue | 480px | centered |
| `/describe` | Describe.vue | 580px | centered |
| `/processing` | Processing.vue | 580px | centered |
| `/review` | Review.vue | 960px | top |
| `/success` | Success.vue | 480px | centered |
| `/history` | History.vue | 720px | top |
| `/examples` | Examples.vue | 860px | top |

---

## Screens

### Landing
- Hero: "Deploy Workers in seconds"
- Sign in with Cloudflare button (white Cloudflare icon from simpleicons)
- Mock mode button (ghost)
- Token fallback dialog (when OAuth unavailable)

### Describe
- Hero: "Describe your Worker"
- Prompt block with textarea
- Toolbar: model pill (toggles free/premium), meta text, examples icon button (ScrollText), generate button with SquareChevronRight icon
- Bottom fixed dock: Cloudflare logo + docs links (Workers docs, Runtime APIs, Pricing)
- On generate: stores tier in sessionStorage, routes to `/processing`

### Processing
- Hero: "AI is processing"
- Rotating status lines: Parsing prompt → Planning worker logic → Writing worker code
- Animated bars (no spinner)
- Min 700ms display time, exits as soon as generate resolves
- Error state shows inline error + back button

### Review
- Hero: "Review + Deploy"
- Worker name input + URL preview
- CodeMirror editor in prompt-block container
- Toolbar: deploy URL preview + Deploy button + Regenerate button
- DeployStepLog component below (always visible, shows 4 steps + event log)

### Success
- Green check circle
- Hero: "Worker is live" (green)
- URL block with green border accent
- Actions: Copy URL (primary), Open (ghost), Deploy another (ghost)

### History
- Hero: "Deploy history"
- Feed of prompt-block items: script name, timestamp, URL, expandable code

### Examples
- Hero: "Worker examples"
- shadcn Tabs (5 sections: Creator/X, Growth, Security, Infra, AI)
- shadcn ScrollArea feed (5 visible rows, internal scroll)
- Each row: title, level badge, outcome, tags, "Use this" button
- On click: fills `description` in useFlowState, routes to `/describe`

---

## Header

Fixed topbar, `68px` height, `backdrop-filter: blur(12px)`.

Left: Logo (orange brand-mark + IBM Plex Mono wordmark)
Right (when authed): History link, Stats button (opens usage dialog), Avatar (click = logout), Theme toggle (lucide Sun/Moon icon button)

Theme toggle: persisted to `localStorage` as `shipwrkrs:theme`. Reads system preference as default. Applied via `document.documentElement.setAttribute('data-theme', ...)`.

---

## Auth

1. "Sign in with Cloudflare" → `/api/auth/login` → Cloudflare OAuth
2. Callback → session cookie set → redirect to `/describe`
3. Token fallback: user pastes CF API token manually (when OAuth disabled)
4. Mock mode: `localStorage.setItem('shipwrkrs_ui_mock', '1')` — all API calls handled client-side with fake data, no limits

---

## Rate limits

Stored in D1, keyed by Cloudflare user ID. Reset daily at 00:00 UTC. Mock mode has no limits.

| Action | Limit |
|---|---|
| AI generations (Workers AI / free) | 10/day |
| AI generations (Anthropic / premium) | 5/day |
| Deploys | 20/day |

---

## Mock mode

Full client-side simulation. Activated from Landing page. Stores flag in `localStorage`. All API calls (`/api/generate`, `/api/deploy`, `/api/history`, etc.) are handled by `mockApi()` in `src/composables/api.ts`. No backend required. No limits. Used for dev and demo.

---

## Do not touch

- `functions/` — all backend Workers code
- `src/composables/` — useAuth, useGenerate, useDeploy, useFlowState, useMeta, api.ts
- `src/components/CodeEditor.vue`
- `src/components/ui/sonner.ts`
- `migrations/`
- `wrangler.toml`
