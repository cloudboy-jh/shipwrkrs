import { Env, badRequest } from '../_lib';

export const onRequestGet: PagesFunction<Env> = async () => {
  return badRequest('OAuth callback is disabled. Use API token auth.', 410);
};
