type MockHistoryItem = {
  id: number;
  scriptName: string;
  url: string;
  status: 'live' | 'deleted';
  code: string;
  secretNames: string[];
  createdAt: string;
};

type SecretManifestItem = {
  name: string;
  label: string;
  description: string;
  helpUrl?: string;
  placeholder?: string;
  required: boolean;
};

type MockStore = {
  limits: {
    free: number;
    premium: number;
    deploy: number;
  };
  history: MockHistoryItem[];
};

const MOCK_FLAG = 'shipwrkrs_ui_mock';
const MOCK_DB = 'shipwrkrs_ui_mock_db';
const MOCK_UNLIMITED = 9999;

function getMockStore(): MockStore {
  const raw = localStorage.getItem(MOCK_DB);
  if (!raw) {
    return {
      limits: { free: 10, premium: 5, deploy: 20 },
      history: [],
    };
  }
  try {
    return JSON.parse(raw) as MockStore;
  } catch {
    return {
      limits: { free: 10, premium: 5, deploy: 20 },
      history: [],
    };
  }
}

function setMockStore(store: MockStore) {
  localStorage.setItem(MOCK_DB, JSON.stringify(store));
}

export function enableUiMockMode() {
  localStorage.setItem(MOCK_FLAG, '1');
}

export function disableUiMockMode() {
  localStorage.removeItem(MOCK_FLAG);
}

export function isUiMockMode() {
  return localStorage.getItem(MOCK_FLAG) === '1';
}

function mockCode(description: string) {
  return `// ${description}\nexport default {\n  async fetch(request, env) {\n    const url = new URL(request.url);\n    const webhook = env.DISCORD_WEBHOOK_URL;\n    if (url.pathname === '/health') return new Response('ok');\n    return Response.json({ ok: true, mock: true, description: ${JSON.stringify(description)}, hasWebhookSecret: Boolean(webhook) });\n  },\n};`;
}

function toTitle(name: string) {
  return name
    .split('_')
    .filter(Boolean)
    .map((part) => part.slice(0, 1) + part.slice(1).toLowerCase())
    .join(' ');
}

function detectSecrets(code: string): SecretManifestItem[] {
  const matches = code.match(/env\.([A-Z_][A-Z0-9_]*)/g) ?? [];
  const names = Array.from(new Set(matches.map((match) => match.replace('env.', ''))));
  return names.map((name) => ({
    name,
    label: toTitle(name),
    description: 'Secret value used by this Worker.',
    placeholder: name.includes('URL') ? 'https://example.com/...' : undefined,
    required: false,
  }));
}

async function mockApi<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method || 'GET').toUpperCase();
  const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
  const store = getMockStore();

  if (path === '/api/auth/me') {
    return {
      oauthEnabled: false,
      mockMode: true,
      user: {
        id: 'mock-user',
        email: 'mock@shipwrkrs.dev',
        name: 'Mock User',
        accountId: 'mock-account',
        authMode: 'oauth',
      },
    } as T;
  }

  if (path === '/api/auth/logout' && method === 'POST') {
    disableUiMockMode();
    return { ok: true } as T;
  }

  if (path === '/api/auth/token' && method === 'PUT') {
    return { ok: true } as T;
  }

  if (path === '/api/limits') {
    return {
      generationsFreeRemaining: MOCK_UNLIMITED,
      generationsPremiumRemaining: MOCK_UNLIMITED,
      deploysRemaining: MOCK_UNLIMITED,
    } as T;
  }

  if (path === '/api/generate' && method === 'POST') {
    const tier = String(body.tier || 'free') === 'premium' ? 'premium' : 'free';
    const description = String(body.description || '').trim();
    if (!description) throw new Error('description is required');
    const code = mockCode(description);
    return {
      code,
      scriptName: description
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 63),
      secrets: detectSecrets(code),
      model: tier === 'premium' ? 'mock-anthropic' : 'mock-workers-ai',
      remaining: MOCK_UNLIMITED,
    } as T;
  }

  if (path === '/api/deploy' && method === 'POST') {
    const scriptName = String(body.scriptName || 'mock-worker');
    const code = String(body.code || '');
    const secrets = Array.isArray(body.secrets)
      ? body.secrets.filter((item): item is { name: string; value: string } => {
          return Boolean(item && typeof item === 'object' && typeof item.name === 'string' && typeof item.value === 'string');
        })
      : [];
    if (!code.trim()) throw new Error('code is required');
    const url = `https://${scriptName}.mock-subdomain.workers.dev`;
    store.history.unshift({
      id: Date.now(),
      scriptName,
      url,
      status: 'live',
      code,
      secretNames: secrets.map((item) => item.name),
      createdAt: new Date().toISOString(),
    });
    setMockStore(store);
    return { url, scriptName, remaining: MOCK_UNLIMITED } as T;
  }

  if (path === '/api/history') {
    return { items: store.history } as T;
  }

  throw new Error(`Mock route not implemented: ${method} ${path}`);
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  if (isUiMockMode()) {
    return mockApi<T>(path, init);
  }

  const response = await fetch(path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown> & { error?: string };
  if (!response.ok) {
    const err = new Error(payload.error ?? `Request failed (${response.status})`) as Error & {
      status: number;
      payload: Record<string, unknown>;
    };
    err.status = response.status;
    err.payload = payload;
    Object.assign(err, payload);
    throw err;
  }
  return payload as T;
}

export function normalizeWorkerCode(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
  }
  return trimmed;
}
