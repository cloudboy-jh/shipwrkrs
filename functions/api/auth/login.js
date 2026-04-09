import { badRequest, isMockMode } from '../_lib';
export const onRequestGet = async ({ env }) => {
    if (isMockMode(env)) {
        return Response.redirect('/api/auth/mock-login', 302);
    }
    if (!env.CF_OAUTH_CLIENT_ID || !env.CF_OAUTH_REDIRECT_URI) {
        return badRequest('OAuth not configured', 503);
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
