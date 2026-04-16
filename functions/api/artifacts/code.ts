import {
  Env,
  badRequest,
  fetchArtifactFileContent,
  getArtifactCommitByDeployId,
  json,
  requireSession,
} from '../_lib';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const session = await requireSession(context).catch(() => null);
  if (!session) return badRequest('Unauthorized', 401);

  const url = new URL(context.request.url);
  const deployId = url.searchParams.get('deployId');
  if (!deployId) return badRequest('deployId is required');

  const deployIdNum = parseInt(deployId, 10);
  if (Number.isNaN(deployIdNum)) return badRequest('Invalid deployId');

  const commitInfo = await getArtifactCommitByDeployId(context.env, session.userId, deployIdNum);
  if (!commitInfo) return badRequest('Deploy not found or has no artifact', 404);

  const content = await fetchArtifactFileContent(context.env, commitInfo.scriptName, commitInfo.commitSha);
  if (content === null) return badRequest('Code not found in artifact', 404);

  return json({ code: content, commitSha: commitInfo.commitSha });
};
