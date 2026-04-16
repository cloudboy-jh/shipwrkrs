import {
  Env,
  badRequest,
  fetchArtifactFileContent,
  getPreviousArtifactCommit,
  json,
  requireSession,
} from '../_lib';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const session = await requireSession(context).catch(() => null);
  if (!session) return badRequest('Unauthorized', 401);

  const url = new URL(context.request.url);
  const scriptName = url.searchParams.get('scriptName');
  if (!scriptName) return badRequest('scriptName is required');

  const prevCommit = await getPreviousArtifactCommit(context.env, session.userId, scriptName);
  if (!prevCommit) return json({ hasPrevious: false, previousCode: null });

  const content = await fetchArtifactFileContent(context.env, scriptName, prevCommit.commitSha);
  if (content === null) return json({ hasPrevious: false, previousCode: null });

  return json({ hasPrevious: true, previousCode: content, commitSha: prevCommit.commitSha });
};
