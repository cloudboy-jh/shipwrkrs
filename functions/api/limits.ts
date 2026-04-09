import { Env, badRequest, getUserLimits, json, requireSession } from './_lib';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const session = await requireSession(context).catch(() => null);
  if (!session) return badRequest('Unauthorized', 401);
  const limits = await getUserLimits(context.env, session.userId);
  return json(limits);
};
