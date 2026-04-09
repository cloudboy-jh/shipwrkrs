import { createSessionToken, ensureUser, isMockMode, setCookie } from '../_lib';
export const onRequestGet = async ({ env }) => {
    if (!isMockMode(env))
        return new Response('Mock mode disabled', { status: 404 });
    if (!env.SESSION_SECRET)
        return new Response('SESSION_SECRET missing', { status: 500 });
    const session = {
        userId: 'mock-user',
        email: 'mock@shipwrkrs.dev',
        name: 'Mock User',
        accountId: 'mock-account',
        authMode: 'mock',
        accessToken: 'mock-token',
    };
    await ensureUser(env, session);
    const token = await createSessionToken(session, env.SESSION_SECRET);
    return new Response(null, {
        status: 302,
        headers: {
            Location: '/describe',
            'Set-Cookie': setCookie('shipwrkrs_session', token),
        },
    });
};
