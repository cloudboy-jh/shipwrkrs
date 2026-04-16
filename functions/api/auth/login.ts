import { Env, badRequest, createSessionToken, ensureUser, getDefaultAccountId, isMockMode, setCookie } from '../_lib';

type CfUserResponse = {
  result?: {
    id: string;
    email?: string;
    first_name?: string;
    last_name?: string;
  };
};

function loginPageHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>shipwrkrs login</title>
  <style>
    :root {
      --bg: #09090b;
      --sf: #0f1012;
      --el: #18191c;
      --tx: #ececef;
      --t2: #9a9ba3;
      --tm: #56575e;
      --bd: #222328;
      --o: #f25706;
      --od: #d94d05;
      --er: #f87171;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      background: var(--bg);
      color: var(--tx);
      font-family: "DM Sans", sans-serif;
    }
    .card {
      width: min(520px, 100%);
      background: var(--sf);
      border: 1px solid var(--bd);
      border-radius: 16px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    h1 {
      margin: 0;
      font-size: 32px;
      line-height: 1.1;
      letter-spacing: -0.03em;
    }
    p {
      margin: 0;
      color: var(--tm);
      font-family: "IBM Plex Mono", monospace;
      font-size: 12px;
      font-weight: 600;
    }
    .banner {
      display: none;
      border: 1px solid color-mix(in srgb, var(--er), var(--bd) 45%);
      background: color-mix(in srgb, var(--er), transparent 90%);
      color: #ffd8d8;
      border-radius: 12px;
      padding: 12px;
      gap: 8px;
      flex-direction: column;
      font-family: "IBM Plex Mono", monospace;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.5;
    }
    .banner.show {
      display: flex;
    }
    .banner strong {
      font-family: "DM Sans", sans-serif;
      font-size: 15px;
      color: #ffecec;
    }
    .banner a {
      color: #fff;
    }
    .signin {
      height: 42px;
      border: none;
      border-radius: 10px;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
      background: var(--o);
      color: #000;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: 130ms ease;
    }
    .signin:hover {
      background: var(--od);
      transform: translateY(-1px);
    }
    .signin[aria-disabled='true'] {
      opacity: 0.55;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <main class="card">
    <h1>Sign in with Cloudflare</h1>
    <p>Loading Cloudflare security check...</p>

    <section id="turnstile-error" class="banner" role="alert" aria-live="polite">
      <strong>Can't reach Cloudflare's security service.</strong>
      <span>If you're using Pi-hole, AdGuard Home, or a similar DNS filter, allowlist <code>challenges.cloudflare.com</code> and reload.</span>
      <span>On a corporate network, ask your admin.</span>
      <a href="/help/network">Open network help</a>
    </section>

    <a id="signin" href="/api/auth/login?start=1" class="signin" aria-disabled="true">Sign in with Cloudflare</a>
    <p id="status">Sign-in is disabled until Cloudflare security services load.</p>
  </main>

  <script>
    (() => {
      const errorEl = document.getElementById('turnstile-error');
      const signin = document.getElementById('signin');
      const status = document.getElementById('status');
      let failed = false;

      function fail() {
        if (failed) return;
        failed = true;
        errorEl.classList.add('show');
        signin.setAttribute('aria-disabled', 'true');
        status.textContent = 'Sign-in is disabled because Cloudflare security services are blocked.';
      }

      function ready() {
        if (failed) return;
        signin.setAttribute('aria-disabled', 'false');
        status.textContent = 'Cloudflare security check loaded. You can sign in.';
      }

      const timer = setTimeout(() => {
        if (!window.turnstile) fail();
      }, 3500);

      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        clearTimeout(timer);
        fail();
      };
      script.onload = () => {
        clearTimeout(timer);
        if (!window.turnstile) {
          fail();
          return;
        }
        ready();
      };

      document.head.appendChild(script);
    })();
  </script>
</body>
</html>`;
}

function redirectToOauth(env: Env) {
  const state = crypto.randomUUID();
  const url = new URL('https://dash.cloudflare.com/oauth2/auth');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', env.CF_OAUTH_CLIENT_ID ?? '');
  url.searchParams.set('redirect_uri', env.CF_OAUTH_REDIRECT_URI ?? '');
  url.searchParams.set('scope', 'account:read user:read workers:write');
  url.searchParams.set('state', state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
      'Set-Cookie': `shipwrkrs_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=600`,
    },
  });
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (isMockMode(env)) {
    return Response.redirect('/api/auth/mock-login', 302);
  }

  const hasOauth = Boolean(env.CF_OAUTH_CLIENT_ID && env.CF_OAUTH_REDIRECT_URI);
  if (!hasOauth) {
    if (!env.CF_DEPLOY_API_TOKEN) return badRequest('OAuth not configured', 503);
    if (!env.SESSION_SECRET) return badRequest('SESSION_SECRET missing', 500);

    const accountId = env.CF_DEPLOY_ACCOUNT_ID ?? (await getDefaultAccountId(env.CF_DEPLOY_API_TOKEN));
    if (!accountId) return badRequest('CF_DEPLOY_ACCOUNT_ID missing', 500);

    const userRes = await fetch('https://api.cloudflare.com/client/v4/user', {
      headers: { Authorization: `Bearer ${env.CF_DEPLOY_API_TOKEN}` },
    });
    const userData = (await userRes.json().catch(() => ({}))) as CfUserResponse;
    const displayName = [userData.result?.first_name, userData.result?.last_name].filter(Boolean).join(' ') || null;

    const session = {
      userId: userData.result?.id ?? 'env-auth-user',
      email: userData.result?.email ?? null,
      name: displayName,
      accountId,
      authMode: 'oauth' as const,
      accessToken: env.CF_DEPLOY_API_TOKEN,
    };

    await ensureUser(env, session);
    const cookie = await createSessionToken(session, env.SESSION_SECRET);
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/describe',
        'Set-Cookie': setCookie('shipwrkrs_session', cookie),
      },
    });
  }

  const url = new URL(request.url);
  if (url.searchParams.get('start') === '1') {
    return redirectToOauth(env);
  }

  return new Response(loginPageHtml(), {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
    },
  });
};
