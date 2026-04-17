import { Env, isMockMode, json, requireSession } from '../_lib';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const session = await requireSession(context).catch(() => null);
  const tokenAuthEnabled = Boolean(context.env.SESSION_SECRET && context.env.AUTH_ENCRYPTION_KEY);

  return json({
    tokenAuthEnabled,
    oauthEnabled: false,
    mockMode: isMockMode(context.env),
    user: session
      ? {
          id: session.userId,
          email: session.email ?? null,
          name: session.name ?? null,
          accountId: session.accountId ?? null,
          authMode: session.authMode === 'mock' ? 'api_token' : session.authMode,
        }
      : null,
  });
};
