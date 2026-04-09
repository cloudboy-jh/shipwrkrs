import { isMockMode, json, requireSession } from '../_lib';
export const onRequestGet = async (context) => {
    const session = await requireSession(context).catch(() => null);
    return json({
        oauthEnabled: Boolean(context.env.CF_OAUTH_CLIENT_ID && context.env.CF_OAUTH_CLIENT_SECRET),
        mockMode: isMockMode(context.env),
        user: session
            ? {
                id: session.userId,
                email: session.email ?? null,
                name: session.name ?? null,
                accountId: session.accountId ?? null,
                authMode: session.authMode === 'mock' ? 'oauth' : session.authMode,
            }
            : null,
    });
};
