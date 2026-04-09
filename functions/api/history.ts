import { Env, badRequest, json, requireSession } from './_lib';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const session = await requireSession(context).catch(() => null);
  if (!session) return badRequest('Unauthorized', 401);

  const rows = await context.env.DB.prepare(
    `SELECT id, script_name, url, status, code, created_at
     FROM deploy_history
     WHERE user_id = ?1
     ORDER BY created_at DESC
     LIMIT 50`,
  )
    .bind(session.userId)
    .all<{
      id: number;
      script_name: string;
      url: string;
      status: 'live' | 'deleted';
      code: string;
      created_at: number;
    }>();

  return json({
    items: (rows.results ?? []).map((r) => ({
      id: r.id,
      scriptName: r.script_name,
      url: r.url,
      status: r.status,
      code: r.code,
      createdAt: new Date(r.created_at).toISOString(),
    })),
  });
};
