# Opencode Project Rules

## UI System

- Use **shadcn-vue** components as the default UI foundation for all new UI work.
- Do not hand-roll core primitives (cards, buttons, dialogs, badges, dropdowns, tabs, inputs) when a shadcn-vue component exists.
- Keep variants and composition consistent with shadcn-vue patterns.

## Styling

- Preserve project design tokens/colors/typography, but apply them through shadcn-vue component structure.
- Avoid unstructured raw markup dumps; pages must have clear visual hierarchy and spacing.
- Do not add CTA-style helper copy or CTA framing language in UI text.
- **Hero headings should fade out after 5 seconds** to reduce visual clutter.

## Component Policy

- Prefer reusable components over repeated inline blocks.
- For new feature pages, compose from shadcn-vue primitives first, then add local wrappers only when needed.

## Custom Components

### CodeEditor

CodeMirror 6-based editor for Worker code.
- Props: `modelValue`, `readOnly?`
- Emits: `update:modelValue`, `expanded-change`

### CloneSection

Button + modal for cloning Workers via git.
- Props: `scriptName`, `cloneUrl`, `inline?`
- Compact icon-only mode when `inline=true`
- Opens centered modal with clone command and copy button

### DiffViewer

Unified/split diff using @pierre/diffs.
- Props: `oldCode`, `newCode`, `oldFilename?`, `newFilename?`
- Toggle between unified and split views
- Built on Shiki for syntax highlighting

## Dev Server

Use `bun run dev` to start both wrangler and vite concurrently:
- Wrangler on port 8788 (API)
- Vite on port 5173 (frontend, proxies /api to 8788)

## Database Migrations

Add new migrations to `migrations/` with sequential numbering:
- `0001_init.sql`
- `0002_*.sql`
- `0003_*.sql`

Apply locally: `bun run db:migrate`
Apply remote: `wrangler d1 migrations apply shipwrkrs-db --remote`
