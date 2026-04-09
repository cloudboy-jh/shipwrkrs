const DAY_MS = 86_400_000;
export function json(data, init = {}) {
    return new Response(JSON.stringify(data), {
        ...init,
        headers: {
            'content-type': 'application/json; charset=utf-8',
            ...(init.headers ?? {}),
        },
    });
}
export function badRequest(message, status = 400) {
    return json({ error: message }, { status });
}
export function isMockMode(env) {
    return env.MOCK_MODE === 'true';
}
export function getCookie(request, name) {
    const raw = request.headers.get('cookie') || '';
    const parts = raw.split(';').map((p) => p.trim());
    for (const part of parts) {
        if (part.startsWith(`${name}=`))
            return decodeURIComponent(part.slice(name.length + 1));
    }
    return null;
}
export function setCookie(name, value, maxAgeSec = 60 * 60 * 24 * 7) {
    return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${maxAgeSec}`;
}
export function clearCookie(name) {
    return `${name}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`;
}
function toBase64Url(bytes) {
    const b64 = btoa(String.fromCharCode(...bytes));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function fromBase64Url(value) {
    const b64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '==='.slice((b64.length + 3) % 4);
    const raw = atob(padded);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1)
        out[i] = raw.charCodeAt(i);
    return out;
}
function asArrayBuffer(bytes) {
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}
async function hmac(secret, value) {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
    return toBase64Url(new Uint8Array(sig));
}
export async function createSessionToken(session, secret) {
    const payload = toBase64Url(new TextEncoder().encode(JSON.stringify(session)));
    const sig = await hmac(secret, payload);
    return `${payload}.${sig}`;
}
export async function readSessionToken(token, secret) {
    const [payload, sig] = token.split('.');
    if (!payload || !sig)
        return null;
    const expected = await hmac(secret, payload);
    if (expected !== sig)
        return null;
    try {
        return JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));
    }
    catch {
        return null;
    }
}
async function importAesKey(keyB64) {
    const keyBytes = fromBase64Url(keyB64);
    return crypto.subtle.importKey('raw', asArrayBuffer(keyBytes), { name: 'AES-GCM' }, false, [
        'encrypt',
        'decrypt',
    ]);
}
export async function encryptText(value, keyB64) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await importAesKey(keyB64);
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(value));
    return `${toBase64Url(iv)}.${toBase64Url(new Uint8Array(encrypted))}`;
}
export async function decryptText(payload, keyB64) {
    const [ivRaw, dataRaw] = payload.split('.');
    if (!ivRaw || !dataRaw)
        throw new Error('invalid payload');
    const key = await importAesKey(keyB64);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64Url(ivRaw) }, key, asArrayBuffer(fromBase64Url(dataRaw)));
    return new TextDecoder().decode(decrypted);
}
export async function requireSession(context) {
    const secret = context.env.SESSION_SECRET;
    if (!secret)
        throw new Error('SESSION_SECRET missing');
    const raw = getCookie(context.request, 'shipwrkrs_session');
    if (!raw)
        return null;
    return readSessionToken(raw, secret);
}
export function utcDayKey(now = Date.now()) {
    const d = new Date(now);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}
export async function getUserLimits(env, userId) {
    const dayKey = utcDayKey();
    const rows = await env.DB.prepare('SELECT action, count FROM rate_limits WHERE user_id = ?1 AND day_key = ?2')
        .bind(userId, dayKey)
        .all();
    const map = new Map();
    for (const row of rows.results ?? [])
        map.set(row.action, row.count);
    return {
        generationsFreeRemaining: Math.max(0, 10 - (map.get('gen_free') ?? 0)),
        generationsPremiumRemaining: Math.max(0, 5 - (map.get('gen_premium') ?? 0)),
        deploysRemaining: Math.max(0, 20 - (map.get('deploy') ?? 0)),
    };
}
export async function incrementAction(env, userId, action) {
    const dayKey = utcDayKey();
    await env.DB.prepare(`INSERT INTO rate_limits (user_id, action, day_key, count, updated_at)
     VALUES (?1, ?2, ?3, 1, ?4)
     ON CONFLICT(user_id, action, day_key)
     DO UPDATE SET count = count + 1, updated_at = excluded.updated_at`)
        .bind(userId, action, dayKey, Date.now())
        .run();
}
export async function ensureUser(env, session) {
    await env.DB.prepare(`INSERT INTO users (id, email, name, account_id, auth_mode, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)
     ON CONFLICT(id)
     DO UPDATE SET email = excluded.email, name = excluded.name, account_id = excluded.account_id,
       auth_mode = excluded.auth_mode, updated_at = excluded.updated_at`)
        .bind(session.userId, session.email ?? null, session.name ?? null, session.accountId ?? null, session.authMode, Date.now())
        .run();
}
export async function saveUserApiToken(env, userId, token, accountId) {
    if (!env.AUTH_ENCRYPTION_KEY)
        throw new Error('AUTH_ENCRYPTION_KEY missing');
    const encrypted = await encryptText(token, env.AUTH_ENCRYPTION_KEY);
    await env.DB.prepare(`INSERT INTO user_tokens (user_id, encrypted_token, account_id, updated_at)
     VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT(user_id)
     DO UPDATE SET encrypted_token = excluded.encrypted_token, account_id = excluded.account_id, updated_at = excluded.updated_at`)
        .bind(userId, encrypted, accountId ?? null, Date.now())
        .run();
}
export async function getStoredApiToken(env, userId) {
    if (!env.AUTH_ENCRYPTION_KEY)
        return null;
    const row = await env.DB.prepare('SELECT encrypted_token, account_id FROM user_tokens WHERE user_id = ?1')
        .bind(userId)
        .first();
    if (!row)
        return null;
    return {
        token: await decryptText(row.encrypted_token, env.AUTH_ENCRYPTION_KEY),
        accountId: row.account_id,
    };
}
export async function getDefaultAccountId(accessToken) {
    const res = await fetch('https://api.cloudflare.com/client/v4/accounts', {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = (await res.json());
    if (!res.ok || !data.result?.length)
        return null;
    return data.result[0].id;
}
export async function cloudflareDeploy(accessToken, accountId, scriptName, code) {
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${scriptName}`;
    const res = await fetch(endpoint, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/javascript',
        },
        body: code,
    });
    const data = (await res.json());
    if (!res.ok || !data.success) {
        throw new Error(data.errors?.[0]?.message ?? 'Cloudflare deploy failed');
    }
    return data;
}
export function makeMockWorkerCode(description) {
    return `// ${description}\nexport default {\n  async fetch(request) {\n    const url = new URL(request.url);\n    if (url.pathname === '/health') return new Response('ok');\n    return Response.json({\n      ok: true,\n      message: 'Mock generated worker',\n      description: ${JSON.stringify(description)},\n      timestamp: new Date().toISOString(),\n    });\n  },\n};`;
}
export async function logDeploy(env, userId, scriptName, url, status, code) {
    await env.DB.prepare(`INSERT INTO deploy_history (user_id, script_name, url, status, code, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)`)
        .bind(userId, scriptName, url, status, code, Date.now())
        .run();
}
export function sleep(ms) {
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
- Add a brief comment at the top describing what the worker does`;
