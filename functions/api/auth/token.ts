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
  const existingSession = await requireSession(context).catch(() => null);

  const body = (await context.request.json().catch(() => null)) as
    | { token?: string; accountId?: string }
    | null;
  const token = body?.token?.trim();
  if (!token) return badRequest('token is required');

  const accountId = body?.accountId?.trim();
  if (!accountId) return badRequest('accountId is required');

  let resolvedUserId = existingSession?.userId ?? `acct:${accountId}`;
  let resolvedEmail: string | null = existingSession?.email ?? null;
  let resolvedName: string | null = existingSession?.name ?? null;

  const userRes = await fetch('https://api.cloudflare.com/client/v4/user', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (userRes.ok) {
    const userData = (await userRes.json().catch(() => ({}))) as {
      result?: { id?: string; email?: string; first_name?: string; last_name?: string };
    };
    if (userData.result?.id) resolvedUserId = userData.result.id;
    if (typeof userData.result?.email === 'string') resolvedEmail = userData.result.email;
    const displayName = [userData.result?.first_name, userData.result?.last_name].filter(Boolean).join(' ') || null;
    if (displayName) resolvedName = displayName;
  }

  const nextSession = {
    userId: resolvedUserId,
    authMode: 'api_token' as const,
    email: resolvedEmail,
    name: resolvedName,
    accountId,
    accessToken: undefined,
  };

  try {
    await ensureUser(context.env, nextSession);
    await saveUserApiToken(context.env, nextSession.userId, token, accountId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('SQLITE_CONSTRAINT_FOREIGNKEY') || message.includes('FOREIGN KEY constraint failed')) {
      return badRequest('Failed to persist token user mapping. Please retry once.', 500);
    }
    throw err;
  }

  const cookie = await createSessionToken(nextSession, context.env.SESSION_SECRET);

  return json(
    { ok: true, userId: nextSession.userId, accountId },
    { headers: { 'Set-Cookie': setCookie('shipwrkrs_session', cookie) } },
  );
};
