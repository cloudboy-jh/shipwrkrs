import { Env, createSessionToken, ensureUser, getMockSession, isMockMode, setCookie } from '../_lib';

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  if (!isMockMode(env)) return new Response('Mock mode disabled', { status: 404 });

  const session = getMockSession();

  await ensureUser(env, session);

  const headers = new Headers({ Location: '/describe' });
  headers.append('Set-Cookie', 'shipwrkrs_mock=1; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=604800');
  if (env.SESSION_SECRET) {
    const token = await createSessionToken(session, env.SESSION_SECRET);
    headers.append('Set-Cookie', setCookie('shipwrkrs_session', token));
  }

  return new Response(null, {
    status: 302,
    headers,
  });
};
