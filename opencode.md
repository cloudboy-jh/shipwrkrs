# Opencode Project Rules

## UI System

- Use **shadcn-vue** components as the default UI foundation for all new UI work.
- Do not hand-roll core primitives (cards, buttons, dialogs, badges, dropdowns, tabs, inputs) when a shadcn-vue component exists.
- Keep variants and composition consistent with shadcn-vue patterns.

## Styling

- Preserve project design tokens/colors/typography, but apply them through shadcn-vue component structure.
- Avoid unstructured raw markup dumps; pages must have clear visual hierarchy and spacing.
- Do not add CTA-style helper copy or CTA framing language in UI text.

## Component Policy

- Prefer reusable components over repeated inline blocks.
- For new feature pages, compose from shadcn-vue primitives first, then add local wrappers only when needed.
