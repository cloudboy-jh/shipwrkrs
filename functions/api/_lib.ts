export type Env = {
  DB: D1Database;
  AI: Ai;
  ANTHROPIC_API_KEY?: string;
  CF_OAUTH_CLIENT_ID?: string;
  CF_OAUTH_CLIENT_SECRET?: string;
  CF_OAUTH_REDIRECT_URI?: string;
  CF_DEPLOY_API_TOKEN?: string;
  CF_DEPLOY_ACCOUNT_ID?: string;
  AUTH_ENCRYPTION_KEY?: string;
  SESSION_SECRET?: string;
  MOCK_MODE?: string;
};

type Session = {
  userId: string;
  email?: string | null;
  name?: string | null;
  accountId?: string | null;
  authMode: 'oauth' | 'api_token' | 'mock';
  accessToken?: string;
};

export function getMockSession(): Session {
  return {
    userId: 'mock-user',
    email: 'mock@shipwrkrs.dev',
    name: 'Mock User',
    accountId: 'mock-account',
    authMode: 'mock',
    accessToken: 'mock-token',
  };
}

const DAY_MS = 86_400_000;

export function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init.headers ?? {}),
    },
  });
}

export function badRequest(message: string, status = 400) {
  return json({ error: message }, { status });
}

export function isMockMode(env: Env) {
  return env.MOCK_MODE === 'true';
}

export function getCookie(request: Request, name: string): string | null {
  const raw = request.headers.get('cookie') || '';
  const parts = raw.split(';').map((p) => p.trim());
  for (const part of parts) {
    if (part.startsWith(`${name}=`)) return decodeURIComponent(part.slice(name.length + 1));
  }
  return null;
}

export function setCookie(name: string, value: string, maxAgeSec = 60 * 60 * 24 * 7) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${maxAgeSec}`;
}

export function clearCookie(name: string) {
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`;
}

function toBase64Url(bytes: Uint8Array): string {
  const b64 = btoa(String.fromCharCode(...bytes));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string): Uint8Array {
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '==='.slice((b64.length + 3) % 4);
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

function asArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function hmac(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return toBase64Url(new Uint8Array(sig));
}

export async function createSessionToken(session: Session, secret: string) {
  const payload = toBase64Url(new TextEncoder().encode(JSON.stringify(session)));
  const sig = await hmac(secret, payload);
  return `${payload}.${sig}`;
}

export async function readSessionToken(token: string, secret: string): Promise<Session | null> {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = await hmac(secret, payload);
  if (expected !== sig) return null;
  try {
    return JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as Session;
  } catch {
    return null;
  }
}

async function importAesKey(keyB64: string) {
  const keyBytes = fromBase64Url(keyB64);
  return crypto.subtle.importKey('raw', asArrayBuffer(keyBytes), { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

export async function encryptText(value: string, keyB64: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await importAesKey(keyB64);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(value),
  );
  return `${toBase64Url(iv)}.${toBase64Url(new Uint8Array(encrypted))}`;
}

export async function decryptText(payload: string, keyB64: string): Promise<string> {
  const [ivRaw, dataRaw] = payload.split('.');
  if (!ivRaw || !dataRaw) throw new Error('invalid payload');
  const key = await importAesKey(keyB64);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64Url(ivRaw) },
    key,
    asArrayBuffer(fromBase64Url(dataRaw)),
  );
  return new TextDecoder().decode(decrypted);
}

export async function requireSession(context: { request: Request; env: Env }) {
  if (isMockMode(context.env)) {
    const mockCookie = getCookie(context.request, 'shipwrkrs_mock');
    if (mockCookie === '1') return getMockSession();
    return null;
  }

  const secret = context.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET missing');
  const raw = getCookie(context.request, 'shipwrkrs_session');
  if (!raw) return null;
  return readSessionToken(raw, secret);
}

export function utcDayKey(now = Date.now()) {
  const d = new Date(now);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
    d.getUTCDate(),
  ).padStart(2, '0')}`;
}

export async function getUserLimits(env: Env, userId: string) {
  const dayKey = utcDayKey();
  const rows = await env.DB.prepare(
    'SELECT action, count FROM rate_limits WHERE user_id = ?1 AND day_key = ?2',
  )
    .bind(userId, dayKey)
    .all<{ action: string; count: number }>();

  const map = new Map<string, number>();
  for (const row of rows.results ?? []) map.set(row.action, row.count);

  return {
    generationsFreeRemaining: Math.max(0, 10 - (map.get('gen_free') ?? 0)),
    generationsPremiumRemaining: Math.max(0, 5 - (map.get('gen_premium') ?? 0)),
    deploysRemaining: Math.max(0, 20 - (map.get('deploy') ?? 0)),
  };
}

export async function incrementAction(env: Env, userId: string, action: 'gen_free' | 'gen_premium' | 'deploy') {
  const dayKey = utcDayKey();
  await env.DB.prepare(
    `INSERT INTO rate_limits (user_id, action, day_key, count, updated_at)
     VALUES (?1, ?2, ?3, 1, ?4)
     ON CONFLICT(user_id, action, day_key)
     DO UPDATE SET count = count + 1, updated_at = excluded.updated_at`,
  )
    .bind(userId, action, dayKey, Date.now())
    .run();
}

export async function ensureUser(env: Env, session: Session) {
  await env.DB.prepare(
    `INSERT INTO users (id, email, name, account_id, auth_mode, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)
     ON CONFLICT(id)
     DO UPDATE SET email = excluded.email, name = excluded.name, account_id = excluded.account_id,
       auth_mode = excluded.auth_mode, updated_at = excluded.updated_at`,
  )
    .bind(session.userId, session.email ?? null, session.name ?? null, session.accountId ?? null, session.authMode, Date.now())
    .run();
}

export async function saveUserApiToken(env: Env, userId: string, token: string, accountId?: string | null) {
  if (!env.AUTH_ENCRYPTION_KEY) throw new Error('AUTH_ENCRYPTION_KEY missing');
  const encrypted = await encryptText(token, env.AUTH_ENCRYPTION_KEY);
  await env.DB.prepare(
    `INSERT INTO user_tokens (user_id, encrypted_token, account_id, updated_at)
     VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT(user_id)
     DO UPDATE SET encrypted_token = excluded.encrypted_token, account_id = excluded.account_id, updated_at = excluded.updated_at`,
  )
    .bind(userId, encrypted, accountId ?? null, Date.now())
    .run();
}

export async function getStoredApiToken(env: Env, userId: string) {
  if (!env.AUTH_ENCRYPTION_KEY) return null;
  const row = await env.DB.prepare('SELECT encrypted_token, account_id FROM user_tokens WHERE user_id = ?1')
    .bind(userId)
    .first<{ encrypted_token: string; account_id: string | null }>();
  if (!row) return null;
  return {
    token: await decryptText(row.encrypted_token, env.AUTH_ENCRYPTION_KEY),
    accountId: row.account_id,
  };
}

export async function getDefaultAccountId(accessToken: string): Promise<string | null> {
  const res = await fetch('https://api.cloudflare.com/client/v4/accounts', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await res.json()) as { success?: boolean; result?: Array<{ id: string }> };
  if (!res.ok || !data.result?.length) return null;
  return data.result[0].id;
}

export async function cloudflareDeploy(accessToken: string, accountId: string, scriptName: string, code: string) {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${scriptName}`;
  const res = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/javascript',
    },
    body: code,
  });
  const data = (await res.json()) as {
    success?: boolean;
    errors?: Array<{ message: string }>;
    result?: { id?: string; etag?: string };
  };
  if (!res.ok || !data.success) {
    throw new Error(data.errors?.[0]?.message ?? 'Cloudflare deploy failed');
  }
  return data;
}

export async function cloudflarePutSecret(
  accessToken: string,
  accountId: string,
  scriptName: string,
  name: string,
  text: string,
) {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${scriptName}/secrets`;
  const res = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, text, type: 'secret_text' }),
  });
  const data = (await res.json()) as {
    success?: boolean;
    errors?: Array<{ message: string }>;
  };
  if (!res.ok || !data.success) {
    throw new Error(data.errors?.[0]?.message ?? 'Cloudflare secret update failed');
  }
}

export function makeMockWorkerCode(description: string) {
  return `// ${description}\nexport default {\n  async fetch(request, env) {\n    const url = new URL(request.url);\n    const webhook = env.DISCORD_WEBHOOK_URL;\n    if (url.pathname === '/health') return new Response('ok');\n    return Response.json({\n      ok: true,\n      message: 'Mock generated worker',\n      description: ${JSON.stringify(description)},\n      hasWebhookSecret: Boolean(webhook),\n      timestamp: new Date().toISOString(),\n    });\n  },\n};`;
}

export async function logDeploy(
  env: Env,
  userId: string,
  scriptName: string,
  url: string,
  status: 'live' | 'deleted',
  code: string,
  secretNames: string[] = [],
) {
  await env.DB.prepare(
    `INSERT INTO deploy_history (user_id, script_name, url, status, code, secret_names, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
  )
    .bind(userId, scriptName, url, status, code, JSON.stringify(secretNames), Date.now())
    .run();
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const SYSTEM_PROMPT = `You are a Cloudflare Worker code generator.

Given a user's description, generate a complete, deployable Cloudflare Worker.

Rules:
- Output ONLY the Worker code, no explanation
- Use ES modules format (export default { async fetch(request, env, ctx) { ... } })
- Handle CORS if the worker serves an API
- Include appropriate error handling
- Use Web Standards APIs (fetch, Request, Response, URL, Headers)
- If the user mentions KV, R2, D1, or other bindings, include them but note they need manual setup
- Keep it minimal — no unnecessary dependencies
- Add a brief comment at the top describing what the worker does
- If secrets are needed, reference them from env using uppercase names (example: env.OPENAI_API_KEY)`;
