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

type GenerationIssue =
  | 'non_code_wrapper_removed'
  | 'invalid_worker_shape'
  | 'non_js_content_detected'
  | 'repair_pass_applied';

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

function normalizeGeneratedCode(raw: string): { code: string; wrapperRemoved: boolean } {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('```')) return { code: trimmed, wrapperRemoved: false };

  const blocks = Array.from(trimmed.matchAll(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g));
  if (!blocks.length) {
    return { code: trimmed.replace(/```/g, '').trim(), wrapperRemoved: true };
  }

  const preferred = blocks.find((b) => /^(js|javascript|ts|typescript)$/i.test((b[1] ?? '').trim())) ?? blocks[0];
  return { code: (preferred[2] ?? '').trim(), wrapperRemoved: true };
}

function validateWorkerCode(code: string): GenerationIssue[] {
  const issues: GenerationIssue[] = [];
  if (!/export\s+default\s*\{/.test(code) || !/fetch\s*\(/.test(code)) {
    issues.push('invalid_worker_shape');
  }

  const suspiciousToml = /^\s*\[[^\]]+\]/m.test(code) || /^\s*name\s*=\s*['"]/m.test(code);
  const suspiciousWrapper = code.includes('```') || code.includes('wrangler.toml');
  if (suspiciousToml || suspiciousWrapper) {
    issues.push('non_js_content_detected');
  }

  return issues;
}

function issueLabel(issue: GenerationIssue): string {
  if (issue === 'invalid_worker_shape') return 'Code must export default Worker with fetch handler.';
  if (issue === 'non_js_content_detected') return 'Output contains non-JavaScript content.';
  if (issue === 'non_code_wrapper_removed') return 'Removed markdown/non-code wrapper from model output.';
  return 'Applied automatic code repair pass.';
}

async function runModel(context: { env: Env }, tier: 'free' | 'premium', userContent: string) {
  if (tier === 'premium') {
    if (!context.env.ANTHROPIC_API_KEY) throw new Error('Premium model unavailable');
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
        messages: [{ role: 'user', content: userContent }],
      }),
    });
    if (!resp.ok) throw new Error('Premium generation failed');
    const data = (await resp.json()) as { content?: Array<{ type: string; text?: string }> };
    return {
      model: 'claude-sonnet',
      code: data.content?.find((c) => c.type === 'text')?.text?.trim() ?? '',
    };
  }

  const model = '@cf/qwen/qwen2.5-coder-32b-instruct';
  const out = await context.env.AI.run(model, {
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    max_tokens: 1800,
    temperature: 0.2,
  });
  const response = out as { response?: string };
  return {
    model,
    code: response.response?.trim() ?? '',
  };
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

  let generated;
  try {
    generated = await runModel(context, tier, description);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed';
    if (message === 'Premium model unavailable') return badRequest(message, 503);
    return badRequest(message, 502);
  }

  if (!generated.code) return badRequest('Model returned empty code', 502);

  const generationIssues: GenerationIssue[] = [];
  const normalized = normalizeGeneratedCode(generated.code);
  let code = normalized.code;
  if (normalized.wrapperRemoved) generationIssues.push('non_code_wrapper_removed');

  let issues = validateWorkerCode(code);
  if (issues.length > 0) {
    const repairPrompt = [
      `User intent: ${description}`,
      `Repair these issues: ${issues.map(issueLabel).join(' ')}`,
      'Return only valid Cloudflare Worker JavaScript ES module code. No markdown. No TOML. No explanation.',
      'Current code:',
      code,
    ].join('\n\n');

    try {
      const repaired = await runModel(context, tier, repairPrompt);
      const repairedNormalized = normalizeGeneratedCode(repaired.code);
      code = repairedNormalized.code;
      issues = validateWorkerCode(code);
      generationIssues.push('repair_pass_applied');
      if (repairedNormalized.wrapperRemoved) generationIssues.push('non_code_wrapper_removed');
    } catch {
      // keep original validation failure path below
    }
  }

  if (issues.length > 0) {
    return badRequest(`Generation failed validation: ${issues.map(issueLabel).join(' ')}`, 502);
  }

  const secrets = buildSecretManifest(code);
  await incrementAction(context.env, session.userId, tier === 'premium' ? 'gen_premium' : 'gen_free');
  const updated = await getUserLimits(context.env, session.userId);
  return json({
    code,
    scriptName: slugifyWorkerName(description),
    secrets,
    model: generated.model,
    generationChips: Array.from(new Set(generationIssues)),
    remaining: tier === 'premium' ? updated.generationsPremiumRemaining : updated.generationsFreeRemaining,
  });
};
