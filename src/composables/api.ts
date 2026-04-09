type MockHistoryItem = {
  id: number;
  scriptName: string;
  url: string;
  status: 'live' | 'deleted';
  code: string;
  createdAt: string;
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
  return `// ${description}\nexport default {\n  async fetch(request) {\n    const url = new URL(request.url);\n    if (url.pathname === '/health') return new Response('ok');\n    return Response.json({ ok: true, mock: true, description: ${JSON.stringify(description)} });\n  },\n};`;
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
      generationsFreeRemaining: store.limits.free,
      generationsPremiumRemaining: store.limits.premium,
      deploysRemaining: store.limits.deploy,
    } as T;
  }

  if (path === '/api/generate' && method === 'POST') {
    const tier = String(body.tier || 'free') === 'premium' ? 'premium' : 'free';
    const description = String(body.description || '').trim();
    if (!description) throw new Error('description is required');
    if (tier === 'free') {
      if (store.limits.free <= 0) throw new Error('Free generation limit hit for today');
      store.limits.free -= 1;
    } else {
      if (store.limits.premium <= 0) throw new Error('Premium generation limit hit for today');
      store.limits.premium -= 1;
    }
    setMockStore(store);
    return {
      code: mockCode(description),
      model: tier === 'premium' ? 'mock-anthropic' : 'mock-workers-ai',
      remaining: tier === 'premium' ? store.limits.premium : store.limits.free,
    } as T;
  }

  if (path === '/api/deploy' && method === 'POST') {
    const scriptName = String(body.scriptName || 'mock-worker');
    const code = String(body.code || '');
    if (!code.trim()) throw new Error('code is required');
    if (store.limits.deploy <= 0) throw new Error('Deploy limit hit for today');
    store.limits.deploy -= 1;
    const url = `https://${scriptName}.mock-subdomain.workers.dev`;
    store.history.unshift({
      id: Date.now(),
      scriptName,
      url,
      status: 'live',
      code,
      createdAt: new Date().toISOString(),
    });
    setMockStore(store);
    return { url, scriptName, remaining: store.limits.deploy } as T;
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

  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed (${response.status})`);
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
