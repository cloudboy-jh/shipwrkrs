import { Env, isMockMode, json, requireSession } from '../_lib';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const session = await requireSession(context).catch(() => null);
  const oauthEnabled = Boolean(
    (context.env.CF_OAUTH_CLIENT_ID && context.env.CF_OAUTH_CLIENT_SECRET) || context.env.CF_DEPLOY_API_TOKEN,
  );
  return json({
    oauthEnabled,
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
