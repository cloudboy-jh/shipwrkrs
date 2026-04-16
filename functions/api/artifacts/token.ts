import { Env, badRequest, json, requireSession } from '../_lib';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const session = await requireSession(context).catch(() => null);
  if (!session) return badRequest('Unauthorized', 401);

  if (!context.env.ARTIFACTS) {
    return badRequest('Artifacts not configured', 503);
  }

  const body = (await context.request.json().catch(() => null)) as { scriptName?: string } | null;
  const scriptName = body?.scriptName?.trim();
  if (!scriptName) return badRequest('scriptName is required');

  const token = await context.env.ARTIFACTS.mintReadToken(scriptName, { expiration: 3600 });
  const remote = `https://artifacts.cloudflare.com/${scriptName}`;

  return json({ token, remote, cloneUrl: `https://artifacts:${token}@artifacts.cloudflare.com/${scriptName}` });
};
