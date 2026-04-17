import type { Env as ApiEnv } from './functions/api/_lib';
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

const routes: Record<string, Partial<Record<string, Handler>>> = {
  '/api/auth/login': { GET: authLoginGet as Handler },
  '/api/auth/callback': { GET: authCallbackGet as Handler },
  '/api/auth/me': { GET: authMeGet as Handler },
  '/api/auth/mock-login': { GET: authMockLoginGet as Handler },
  '/api/auth/logout': { POST: authLogoutPost as Handler },
  '/api/auth/token': { PUT: authTokenPut as Handler },
  '/api/generate': { POST: generatePost as Handler },
  '/api/deploy': { POST: deployPost as Handler },
  '/api/history': { GET: historyGet as Handler },
  '/api/limits': { GET: limitsGet as Handler },
};

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

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : url.pathname;

    if (path.startsWith('/api/')) {
      const methodHandlers = routes[path];
      if (!methodHandlers) {
        return withNoStore(jsonError('Not found', 404));
      }

      const handler = methodHandlers[request.method as keyof typeof methodHandlers];
      if (!handler) {
        const allow = Object.keys(methodHandlers).join(', ');
        return withNoStore(jsonError('Method not allowed', 405, { Allow: allow }));
      }

      try {
        const response = await handler({ request, env });
        return withNoStore(response);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        console.error(`[api] ${request.method} ${path} -> 500: ${message}`);
        return withNoStore(jsonError(message, 500));
      }
    }

    return env.ASSETS.fetch(request);
  },
};
