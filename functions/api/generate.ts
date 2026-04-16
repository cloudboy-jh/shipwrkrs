import {
  Env,
  SYSTEM_PROMPT,
  badRequest,
  getUserLimits,
  incrementAction,
  isMockMode,
  json,
  makeMockWorkerCode,
  requireSession,
  sleep,
} from './_lib';

type GenerateBody = {
  description?: string;
  tier?: 'free' | 'premium';
};

type SecretManifestItem = {
  name: string;
  label: string;
  description: string;
  helpUrl?: string;
  placeholder?: string;
  required: boolean;
};

function slugifyWorkerName(input: string) {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  return (slug || 'shipwrkrs-worker').slice(0, 63);
}

function toLabel(name: string) {
  return name
    .split('_')
    .filter(Boolean)
    .map((part) => part.slice(0, 1) + part.slice(1).toLowerCase())
    .join(' ');
}

function buildSecretManifest(code: string): SecretManifestItem[] {
  const matches = code.match(/env\.([A-Z_][A-Z0-9_]*)/g) ?? [];
  const names = Array.from(new Set(matches.map((match) => match.replace('env.', ''))));
  return names.map((name) => ({
    name,
    label: toLabel(name),
    description: 'Secret value used by this Worker.',
    placeholder: name.includes('URL') ? 'https://example.com/...' : undefined,
    required: false,
  }));
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const session = await requireSession(context).catch(() => null);
  if (!session) return badRequest('Unauthorized', 401);

  const body = (await context.request.json().catch(() => null)) as GenerateBody | null;
  const description = body?.description?.trim();
  const tier = body?.tier === 'premium' ? 'premium' : 'free';
  if (!description) return badRequest('description is required');

  const limits = await getUserLimits(context.env, session.userId);
  if (tier === 'free' && limits.generationsFreeRemaining <= 0) {
    return badRequest('Free generation limit hit for today', 429);
  }
  if (tier === 'premium' && limits.generationsPremiumRemaining <= 0) {
    return badRequest('Premium generation limit hit for today', 429);
  }

  if (isMockMode(context.env)) {
    await sleep(450);
    await incrementAction(context.env, session.userId, tier === 'premium' ? 'gen_premium' : 'gen_free');
    const code = makeMockWorkerCode(description);
    const secrets = buildSecretManifest(code);
    const updated = await getUserLimits(context.env, session.userId);
    return json({
      code,
      scriptName: slugifyWorkerName(description),
      secrets,
      model: tier === 'premium' ? 'mock-anthropic' : 'mock-workers-ai',
      remaining: tier === 'premium' ? updated.generationsPremiumRemaining : updated.generationsFreeRemaining,
    });
  }

  let code = '';
  let model = '';
  if (tier === 'premium') {
    if (!context.env.ANTHROPIC_API_KEY) return badRequest('Premium model unavailable', 503);
    model = 'claude-sonnet';
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': context.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1800,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: description }],
      }),
    });
    if (!resp.ok) return badRequest('Premium generation failed', 502);
    const data = (await resp.json()) as { content?: Array<{ type: string; text?: string }> };
    code = data.content?.find((c) => c.type === 'text')?.text?.trim() ?? '';
  } else {
    if (!context.env.AI) return badRequest('AI binding not available in local dev. Use premium tier or mock mode.', 503);
    model = '@cf/qwen/qwen2.5-coder-32b-instruct';
    const out = await context.env.AI.run(model, {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: description },
      ],
      max_tokens: 1800,
      temperature: 0.2,
    });
    const response = out as { response?: string };
    code = response.response?.trim() ?? '';
  }

  if (!code) return badRequest('Model returned empty code', 502);

  const secrets = buildSecretManifest(code);
  await incrementAction(context.env, session.userId, tier === 'premium' ? 'gen_premium' : 'gen_free');
  const updated = await getUserLimits(context.env, session.userId);
  return json({
    code,
    scriptName: slugifyWorkerName(description),
    secrets,
    model,
    remaining: tier === 'premium' ? updated.generationsPremiumRemaining : updated.generationsFreeRemaining,
  });
};
