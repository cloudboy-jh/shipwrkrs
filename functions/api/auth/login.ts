import { Env, badRequest, createSessionToken, ensureUser, getDefaultAccountId, isMockMode, setCookie } from '../_lib';

type CfUserResponse = {
  result?: {
    id: string;
    email?: string;
    first_name?: string;
    last_name?: string;
  };
};

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
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

  const state = crypto.randomUUID();
  const url = new URL('https://dash.cloudflare.com/oauth2/auth');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', env.CF_OAUTH_CLIENT_ID);
  url.searchParams.set('redirect_uri', env.CF_OAUTH_REDIRECT_URI);
  url.searchParams.set('scope', 'account:read user:read workers:write');
  url.searchParams.set('state', state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
      'Set-Cookie': `shipwrkrs_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=600`,
    },
  });
};
