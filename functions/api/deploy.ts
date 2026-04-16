import {
  Env,
  badRequest,
  cloudflareDeploy,
  cloudflarePutSecret,
  commitCodeToArtifacts,
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
  secrets?: Array<{ name?: string; value?: string }>;
  retrySecretName?: string;
};

function validScriptName(name: string) {
  return /^[a-z0-9-]{1,63}$/.test(name);
}

function validSecretName(name: string) {
  return /^[A-Z_][A-Z0-9_]*$/.test(name);
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const session = await requireSession(context).catch(() => null);
  if (!session) return badRequest('Unauthorized', 401);

  const body = (await context.request.json().catch(() => null)) as DeployBody | null;
  const scriptName = body?.scriptName?.trim().toLowerCase();
  const code = body?.code?.trim();
  const retrySecretName = body?.retrySecretName?.trim();
  const isSecretRetry = Boolean(retrySecretName);
  const secrets = (body?.secrets ?? [])
    .filter((secret) => secret?.name && typeof secret.value === 'string')
    .map((secret) => ({ name: String(secret.name).trim(), value: String(secret.value ?? '') }));

  if (!scriptName || !validScriptName(scriptName)) {
    return badRequest('scriptName must be lowercase alphanumeric and dashes only, max 63 chars');
  }
  if (!code) return badRequest('code is required');
  if (retrySecretName && !validSecretName(retrySecretName)) return badRequest('retrySecretName is invalid');

  for (const secret of secrets) {
    if (!validSecretName(secret.name)) return badRequest(`Invalid secret name: ${secret.name}`);
  }

  const limits = await getUserLimits(context.env, session.userId);
  if (!isSecretRetry && limits.deploysRemaining <= 0) return badRequest('Deploy limit hit for today', 429);

  if (isMockMode(context.env)) {
    await sleep(500);
    const url = `https://${scriptName}.mock-subdomain.workers.dev`;
    if (!isSecretRetry) {
      await incrementAction(context.env, session.userId, 'deploy');
      const artifact = await commitCodeToArtifacts(context.env, scriptName, code);
      await logDeploy(
        context.env,
        session.userId,
        scriptName,
        url,
        'live',
        code,
        secrets.map((secret) => secret.name),
        artifact?.remote,
        artifact?.sha,
      );
      const updated = await getUserLimits(context.env, session.userId);
      return json({ url, scriptName, remaining: updated.deploysRemaining, artifactRemote: artifact?.remote, artifactCommitSha: artifact?.sha });
    }
    return json({ url, scriptName, remaining: limits.deploysRemaining });
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

  if (!retrySecretName) {
    await cloudflareDeploy(accessToken, accountId, scriptName, code);
  }

  const secretsToWrite = retrySecretName
    ? secrets.filter((secret) => secret.name === retrySecretName)
    : secrets;

  if (retrySecretName && secretsToWrite.length === 0) {
    return badRequest(`retrySecretName is missing from submitted secrets: ${retrySecretName}`);
  }

  for (const secret of secretsToWrite) {
    try {
      // Shipwrkrs deploys ES module Workers, so secrets can be updated via API without script re-upload.
      await cloudflarePutSecret(accessToken, accountId, scriptName, secret.name, secret.value);
    } catch {
      return json(
        {
          error: `Failed to set secret ${secret.name}`,
          failedSecret: secret.name,
          secretRetryable: true,
        },
        { status: 502 },
      );
    }
  }

  const url = `https://${scriptName}.workers.dev`;
  if (!isSecretRetry) {
    await incrementAction(context.env, session.userId, 'deploy');
    const artifact = await commitCodeToArtifacts(context.env, scriptName, code);
    await logDeploy(
      context.env,
      session.userId,
      scriptName,
      url,
      'live',
      code,
      secrets.map((secret) => secret.name),
      artifact?.remote,
      artifact?.sha,
    );
    const updated = await getUserLimits(context.env, session.userId);
    return json({ url, scriptName, remaining: updated.deploysRemaining, artifactRemote: artifact?.remote, artifactCommitSha: artifact?.sha });
  }
  return json({ url, scriptName, remaining: limits.deploysRemaining });
};
