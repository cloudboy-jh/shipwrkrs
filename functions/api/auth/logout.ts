import { Env, clearCookie, json } from '../_lib';

export const onRequestPost: PagesFunction<Env> = async () => {
  const headers = new Headers();
  headers.append('Set-Cookie', clearCookie('shipwrkrs_session'));
  headers.append('Set-Cookie', 'shipwrkrs_mock=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0');
  return json(
    { ok: true },
    {
      headers,
    },
  );
};
