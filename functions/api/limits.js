import { badRequest, getUserLimits, json, requireSession } from './_lib';
export const onRequestGet = async (context) => {
    const session = await requireSession(context).catch(() => null);
    if (!session)
        return badRequest('Unauthorized', 401);
    const limits = await getUserLimits(context.env, session.userId);
    return json(limits);
};
