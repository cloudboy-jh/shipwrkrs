export type Env = {
    DB: D1Database;
    AI: Ai;
    ANTHROPIC_API_KEY?: string;
    CF_OAUTH_CLIENT_ID?: string;
    CF_OAUTH_CLIENT_SECRET?: string;
    CF_OAUTH_REDIRECT_URI?: string;
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
export declare function json(data: unknown, init?: ResponseInit): Response;
export declare function badRequest(message: string, status?: number): Response;
export declare function isMockMode(env: Env): boolean;
export declare function getCookie(request: Request, name: string): string | null;
export declare function setCookie(name: string, value: string, maxAgeSec?: number): string;
export declare function clearCookie(name: string): string;
export declare function createSessionToken(session: Session, secret: string): Promise<string>;
export declare function readSessionToken(token: string, secret: string): Promise<Session | null>;
export declare function encryptText(value: string, keyB64: string): Promise<string>;
export declare function decryptText(payload: string, keyB64: string): Promise<string>;
export declare function requireSession(context: {
    request: Request;
    env: Env;
}): Promise<Session | null>;
export declare function utcDayKey(now?: number): string;
export declare function getUserLimits(env: Env, userId: string): Promise<{
    generationsFreeRemaining: number;
    generationsPremiumRemaining: number;
    deploysRemaining: number;
}>;
export declare function incrementAction(env: Env, userId: string, action: 'gen_free' | 'gen_premium' | 'deploy'): Promise<void>;
export declare function ensureUser(env: Env, session: Session): Promise<void>;
export declare function saveUserApiToken(env: Env, userId: string, token: string, accountId?: string | null): Promise<void>;
export declare function getStoredApiToken(env: Env, userId: string): Promise<{
    token: string;
    accountId: any;
} | null>;
export declare function getDefaultAccountId(accessToken: string): Promise<string | null>;
export declare function cloudflareDeploy(accessToken: string, accountId: string, scriptName: string, code: string): Promise<{
    success?: boolean;
    errors?: Array<{
        message: string;
    }>;
    result?: {
        id?: string;
        etag?: string;
    };
}>;
export declare function makeMockWorkerCode(description: string): string;
export declare function logDeploy(env: Env, userId: string, scriptName: string, url: string, status: 'live' | 'deleted', code: string): Promise<void>;
export declare function sleep(ms: number): Promise<unknown>;
export declare const SYSTEM_PROMPT = "You are a Cloudflare Worker code generator.\n\nGiven a user's description, generate a complete, deployable Cloudflare Worker.\n\nRules:\n- Output ONLY the Worker code, no explanation\n- Use ES modules format (export default { async fetch(request, env, ctx) { ... } })\n- Handle CORS if the worker serves an API\n- Include appropriate error handling\n- Use Web Standards APIs (fetch, Request, Response, URL, Headers)\n- If the user mentions KV, R2, D1, or other bindings, include them but note they need manual setup\n- Keep it minimal \u2014 no unnecessary dependencies\n- Add a brief comment at the top describing what the worker does";
export {};
