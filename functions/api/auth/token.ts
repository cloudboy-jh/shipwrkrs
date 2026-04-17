import {
  Env,
  badRequest,
  createSessionToken,
  ensureUser,
  json,
  requireSession,
  saveUserApiToken,
  setCookie,
} from '../_lib';

export const onRequestPut: PagesFunction<Env> = async (context) => {
  if (!context.env.SESSION_SECRET) return badRequest('SESSION_SECRET missing', 500);
  let session = await requireSession(context).catch(() => null);
  if (!session) {
    session = {
      userId: `token-${crypto.randomUUID()}`,
      authMode: 'api_token' as const,
      email: null,
      name: null,
      accountId: null,
    };
  }

  const body = (await context.request.json().catch(() => null)) as
    | { token?: string; accountId?: string }
    | null;
  const token = body?.token?.trim();
  if (!token) return badRequest('token is required');

  const accountId = body?.accountId?.trim();
  if (!accountId) return badRequest('accountId is required');

  const nextSession = {
    ...session,
    authMode: 'api_token' as const,
    accountId,
    accessToken: undefined,
  };

  try {
    await ensureUser(context.env, nextSession);
    await saveUserApiToken(context.env, session.userId, token, accountId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('SQLITE_CONSTRAINT_FOREIGNKEY') || message.includes('FOREIGN KEY constraint failed')) {
      return badRequest('Failed to persist token user mapping. Please retry once.', 500);
    }
    throw err;
  }

  const cookie = await createSessionToken(nextSession, context.env.SESSION_SECRET);

  return json(
    { ok: true, userId: session.userId, accountId },
    { headers: { 'Set-Cookie': setCookie('shipwrkrs_session', cookie) } },
  );
};
