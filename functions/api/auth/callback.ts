import {
  Env,
  badRequest,
  createSessionToken,
  ensureUser,
  getCookie,
  getDefaultAccountId,
  setCookie,
} from '../_lib';

type OAuthTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.CF_OAUTH_CLIENT_ID || !env.CF_OAUTH_CLIENT_SECRET || !env.CF_OAUTH_REDIRECT_URI) {
    return badRequest('OAuth not configured', 503);
  }
  if (!env.SESSION_SECRET) return badRequest('SESSION_SECRET missing', 500);

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieState = getCookie(request, 'shipwrkrs_oauth_state');
  if (!code || !state || !cookieState || state !== cookieState) {
    return badRequest('Invalid OAuth callback state');
  }

  const tokenRes = await fetch('https://dash.cloudflare.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: env.CF_OAUTH_CLIENT_ID,
      client_secret: env.CF_OAUTH_CLIENT_SECRET,
      redirect_uri: env.CF_OAUTH_REDIRECT_URI,
    }),
  });

  if (!tokenRes.ok) return badRequest('Failed to exchange OAuth code', 401);
  const tokenData = (await tokenRes.json()) as OAuthTokenResponse;

  const userRes = await fetch('https://api.cloudflare.com/client/v4/user', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const userData = (await userRes.json()) as {
    success?: boolean;
    result?: { id: string; email: string; first_name?: string; last_name?: string };
  };
  if (!userRes.ok || !userData.result) return badRequest('Failed to fetch Cloudflare user', 401);

  const accountId = await getDefaultAccountId(tokenData.access_token);
  const session = {
    userId: userData.result.id,
    email: userData.result.email,
    name: [userData.result.first_name, userData.result.last_name].filter(Boolean).join(' ') || null,
    accountId,
    authMode: 'oauth' as const,
    accessToken: tokenData.access_token,
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
};
