import type { Env as ApiEnv } from './functions/api/_lib';
import { Hono } from 'hono';
import { onRequestGet as authCallbackGet } from './functions/api/auth/callback';
import { onRequestGet as authLoginGet } from './functions/api/auth/login';
import { onRequestGet as authMeGet } from './functions/api/auth/me';
import { onRequestGet as authMockLoginGet } from './functions/api/auth/mock-login';
import { onRequestPost as authLogoutPost } from './functions/api/auth/logout';
import { onRequestPut as authTokenPut } from './functions/api/auth/token';
import { onRequestPost as deployPost } from './functions/api/deploy';
import { onRequestPost as generatePost } from './functions/api/generate';
import { onRequestGet as historyGet } from './functions/api/history';
import { onRequestGet as limitsGet } from './functions/api/limits';

type HandlerContext = {
  request: Request;
  env: ApiEnv;
};

type Handler = (context: HandlerContext) => Promise<Response>;

type WorkerEnv = ApiEnv & {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
};

const app = new Hono<{ Bindings: WorkerEnv }>();

function jsonError(message: string, status: number, headers?: HeadersInit) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(headers ?? {}),
    },
  });
}

function withNoStore(response: Response) {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  headers.set('Pragma', 'no-cache');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function asHonoHandler(handler: Handler) {
  return async (c: { req: { raw: Request }; env: WorkerEnv }) => {
    const response = await handler({ request: c.req.raw, env: c.env });
    return withNoStore(response);
  };
}

app.onError((error, c) => {
  const path = c.req.path.length > 1 ? c.req.path.replace(/\/+$/, '') : c.req.path;
  const message = error instanceof Error ? error.message : 'Internal server error';
  console.error(`[api] ${c.req.method} ${path} -> 500: ${message}`);
  return withNoStore(jsonError(message, 500));
});

app.get('/api/auth/login', asHonoHandler(authLoginGet as Handler));
app.get('/api/auth/callback', asHonoHandler(authCallbackGet as Handler));
app.get('/api/auth/me', asHonoHandler(authMeGet as Handler));
app.get('/api/auth/mock-login', asHonoHandler(authMockLoginGet as Handler));
app.post('/api/auth/logout', asHonoHandler(authLogoutPost as Handler));
app.put('/api/auth/token', asHonoHandler(authTokenPut as Handler));
app.post('/api/generate', asHonoHandler(generatePost as Handler));
app.post('/api/deploy', asHonoHandler(deployPost as Handler));
app.get('/api/history', asHonoHandler(historyGet as Handler));
app.get('/api/limits', asHonoHandler(limitsGet as Handler));

app.all('/api/*', (c) => withNoStore(jsonError('Not found', 404)));
app.all('*', (c) => c.env.ASSETS.fetch(c.req.raw));

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    return app.fetch(request, env);
  },
};
