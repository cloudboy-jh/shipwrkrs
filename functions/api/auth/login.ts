import { Env, isMockMode } from '../_lib';

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  if (isMockMode(env)) {
    return Response.redirect('/api/auth/mock-login', 302);
  }
  return Response.redirect('/?auth=token', 302);
};
