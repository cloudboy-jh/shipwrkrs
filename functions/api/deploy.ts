import {
  Env,
  badRequest,
  cloudflareDeploy,
  getStoredApiToken,
  getUserLimits,
  incrementAction,
  isMockMode,
  json,
  logDeploy,
  requireSession,
  sleep,
} from './_lib';

type DeployBody = {
  scriptName?: string;
  code?: string;
};

function validScriptName(name: string) {
  return /^[a-z0-9-]{1,63}$/.test(name);
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const session = await requireSession(context).catch(() => null);
  if (!session) return badRequest('Unauthorized', 401);

  const body = (await context.request.json().catch(() => null)) as DeployBody | null;
  const scriptName = body?.scriptName?.trim().toLowerCase();
  const code = body?.code?.trim();

  if (!scriptName || !validScriptName(scriptName)) {
    return badRequest('scriptName must be lowercase alphanumeric and dashes only, max 63 chars');
  }
  if (!code) return badRequest('code is required');

  const limits = await getUserLimits(context.env, session.userId);
  if (limits.deploysRemaining <= 0) return badRequest('Deploy limit hit for today', 429);

  if (isMockMode(context.env)) {
    await sleep(500);
    const url = `https://${scriptName}.mock-subdomain.workers.dev`;
    await incrementAction(context.env, session.userId, 'deploy');
    await logDeploy(context.env, session.userId, scriptName, url, 'live', code);
    const updated = await getUserLimits(context.env, session.userId);
    return json({ url, scriptName, remaining: updated.deploysRemaining });
  }

  let accessToken = session.accessToken;
  let accountId = session.accountId;

  if (!accessToken || session.authMode === 'api_token') {
    const stored = await getStoredApiToken(context.env, session.userId);
    accessToken = stored?.token;
    accountId = stored?.accountId ?? accountId;
  }
  if (!accessToken) return badRequest('No deploy token available. Re-auth or set token once.', 401);
  if (!accountId) return badRequest('Account ID unavailable', 400);

  await cloudflareDeploy(accessToken, accountId, scriptName, code);

  const url = `https://${scriptName}.workers.dev`;
  await incrementAction(context.env, session.userId, 'deploy');
  await logDeploy(context.env, session.userId, scriptName, url, 'live', code);
  const updated = await getUserLimits(context.env, session.userId);
  return json({ url, scriptName, remaining: updated.deploysRemaining });
};
