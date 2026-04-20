# shipwrkrs.dev

![shipwrkrs banner](./shipwrkrs-readme-logo.png)

Generate and deploy Cloudflare Workers from plain English.

## What you can do

- Describe what you want in normal language
- Generate Worker code instantly
- Review and edit code before deploy
- Deploy to your Cloudflare account
- Open each Worker directly in Cloudflare dashboard
- Track deploy history

## How it works

1. Connect your Cloudflare account with an API token + account ID
2. Describe the Worker you want
3. Review/edit generated code
4. Deploy
5. Use **Open in Cloudflare Dashboard** to manage Domains & Routes

## Cloudflare token permissions

Minimum recommended permissions:

- Account → Account Settings → Read
- Account → Workers Scripts → Edit
- Account → Workers Scripts → Read (recommended)
- User → User Details → Read (optional, profile/email)

If you only grant less than this, deploys can fail.

## Important note on URLs

After deploy, shipwrkrs gives you:

- A **Cloudflare dashboard link** (primary action)
- A **live URL** (when available)

Use the dashboard link to confirm Workers domain/route state if a preview URL shows inactive.

## Pricing/model behavior

- Free generation: Workers AI
- Premium generation: Anthropic (when enabled)

## Security

- API tokens are encrypted at rest
- Secrets are sent to Cloudflare during deploy
- Secrets are not stored as plaintext in shipwrkrs

## Need help?

If deploy fails, re-check:

- token permissions
- account ID
- Worker name format (`a-z`, `0-9`, `-`)
