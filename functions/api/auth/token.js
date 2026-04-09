import { badRequest, createSessionToken, ensureUser, getDefaultAccountId, json, requireSession, saveUserApiToken, setCookie, } from '../_lib';
export const onRequestPut = async (context) => {
    if (!context.env.SESSION_SECRET)
        return badRequest('SESSION_SECRET missing', 500);
    let session = await requireSession(context).catch(() => null);
    if (!session) {
        session = {
            userId: `token-${crypto.randomUUID()}`,
            authMode: 'api_token',
            email: null,
            name: null,
            accountId: null,
        };
    }
    const body = (await context.request.json().catch(() => null));
    const token = body?.token?.trim();
    if (!token)
        return badRequest('token is required');
    const accountId = body?.accountId?.trim() || (await getDefaultAccountId(token));
    if (!accountId)
        return badRequest('Unable to resolve account id from token');
    await saveUserApiToken(context.env, session.userId, token, accountId);
    const nextSession = {
        ...session,
        authMode: 'api_token',
        accountId,
        accessToken: undefined,
    };
    await ensureUser(context.env, nextSession);
    const cookie = await createSessionToken(nextSession, context.env.SESSION_SECRET);
    return json({ ok: true, userId: session.userId, accountId }, { headers: { 'Set-Cookie': setCookie('shipwrkrs_session', cookie) } });
};
