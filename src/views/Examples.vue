<template>
  <div class="page-top">
    <div class="page-content">
      <div class="hero">
        <h1>Worker <em>examples</em></h1>
        <p>real deployments, pick and ship</p>
      </div>

      <Tabs :default-value="sections[0].title" class="w-full">
        <div class="top-controls">
          <TabsList class="tabs-list">
            <TabsTrigger v-for="section in sections" :key="section.title" :value="section.title" class="tab-trigger">
              {{ section.title }}
            </TabsTrigger>
          </TabsList>

          <Button variant="outline" class="back-btn" @click="backToDescribe">Back</Button>
        </div>

        <TabsContent v-for="section in sections" :key="section.title" :value="section.title" class="tab-content">
          <Card class="examples-card">
            <CardHeader class="card-head">
              <CardTitle class="card-title">{{ section.title }}</CardTitle>
              <CardDescription class="card-sub">{{ section.subtitle }}</CardDescription>
            </CardHeader>

            <CardContent class="card-content">
              <ScrollArea class="feed-scroll">
                <div class="feed-list">
                  <template v-for="(example, index) in section.examples" :key="example.title">
                    <div class="feed-row">
                      <div class="row-left">
                        <div class="row-title-wrap">
                          <p class="row-title">{{ example.title }}</p>
                          <Badge variant="outline" class="level-pill">{{ example.level }}</Badge>
                        </div>

                        <p class="row-outcome">{{ example.outcome }}</p>

                        <div class="row-tags">
                          <Badge v-for="tag in visibleTags(example.tags)" :key="`${example.title}-${tag}`" variant="secondary">
                            {{ tag }}
                          </Badge>
                          <Badge v-if="example.tags.length > 2" variant="secondary">+{{ example.tags.length - 2 }}</Badge>
                        </div>
                      </div>

                      <Button size="sm" variant="secondary" class="use-btn" @click="useExample(example.prompt)">
                        Use this
                      </Button>
                    </div>

                    <Separator v-if="index < section.examples.length - 1" class="row-sep" />
                  </template>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '../composables/useAuth';
import { useFlowState } from '../composables/useFlowState';

type ExampleItem = {
  title: string;
  level: 'simple' | 'medium';
  outcome: string;
  tags: string[];
  prompt: string;
};

type ExampleSection = {
  title: string;
  subtitle: string;
  examples: ExampleItem[];
};

const router = useRouter();
const { refresh, isAuthed } = useAuth();
const { description } = useFlowState();

const sections: ExampleSection[] = [
  {
    title: 'Creator / X',
    subtitle: 'Social and creator workflows.',
    examples: [
      { title: 'Thread Reader API', level: 'medium', outcome: 'Turn thread URL into normalized JSON.', tags: ['x', 'api', 'content'], prompt: 'Build a Worker API that takes an X thread URL and returns normalized JSON (author, text, timestamps, media). Include input validation and timeout handling.' },
      { title: 'Dynamic OG Card Generator', level: 'simple', outcome: 'Generate social cards from query params.', tags: ['creator', 'images', 'edge'], prompt: 'Create /og endpoint to generate social preview images from title/subtitle/theme/avatar params with sensible defaults and cache headers.' },
      { title: 'Bio Link Analytics Router', level: 'simple', outcome: 'Track clicks while redirecting fast.', tags: ['analytics', 'redirect'], prompt: 'Build shortlink router that redirects by slug and logs click metadata (timestamp, country, referrer, UA). Return 404 for unknown slug.' },
      { title: 'Profile Link Health Checker', level: 'simple', outcome: 'Check all bio links for status and latency.', tags: ['creator', 'monitoring'], prompt: 'Create Worker endpoint that accepts a list of URLs and returns status checks with latency and failure flags.' },
      { title: 'Tweet-to-Webhook Relay', level: 'medium', outcome: 'Forward matching post events to webhook.', tags: ['x', 'webhook'], prompt: 'Build a Worker relay that receives post payloads and forwards matching events to configured webhooks with retry-safe responses.' },
      { title: 'Link Expander API', level: 'simple', outcome: 'Resolve final destination of shortened links.', tags: ['api', 'redirect'], prompt: 'Create Worker API that takes a short URL, follows redirects safely, and returns final URL plus redirect chain.' },
    ],
  },
  {
    title: 'Growth',
    subtitle: 'Acquisition and conversion workflows.',
    examples: [
      { title: 'Referral Waitlist API', level: 'medium', outcome: 'Capture signups with referral codes.', tags: ['waitlist', 'referrals'], prompt: 'Build waitlist signup API with email/referral/source fields, per-IP throttling, and webhook forward for valid records.' },
      { title: 'A/B Variant Edge Router', level: 'medium', outcome: 'Split traffic with sticky buckets.', tags: ['ab-test', 'cookies'], prompt: 'Create Worker that assigns A/B variants via sticky cookie and routes to different upstream targets, exposing variant response header.' },
      { title: 'Geo Launch Redirector', level: 'simple', outcome: 'Route users to country-specific pages.', tags: ['geo', 'redirect'], prompt: 'Build Worker redirector that routes by country to locale paths with fallback and QA override query param.' },
      { title: 'UTM Cleaner + Tracker', level: 'simple', outcome: 'Store UTM data then redirect to clean URL.', tags: ['utm', 'analytics'], prompt: 'Create Worker that captures UTM params, logs them, then redirects user to canonical URL without tracking params.' },
      { title: 'Campaign Throttle Gate', level: 'medium', outcome: 'Rate-limit hot campaigns to protect origin.', tags: ['rate-limit', 'ops'], prompt: 'Build edge throttle gate with per-IP and global burst controls for campaign routes and custom fallback response.' },
      { title: 'Lead Scoring Intake API', level: 'medium', outcome: 'Score and tag incoming leads instantly.', tags: ['leads', 'api'], prompt: 'Create Worker endpoint that receives lead payloads, applies rule-based scoring, and forwards scored data to webhook.' },
    ],
  },
  {
    title: 'Security',
    subtitle: 'Defensive edge patterns.',
    examples: [
      { title: 'API Key Shield Proxy', level: 'medium', outcome: 'Hide upstream API keys behind auth.', tags: ['security', 'proxy'], prompt: 'Create Worker proxy that validates client token, injects upstream secret API key, and blocks unknown origins.' },
      { title: 'Signed URL Gate', level: 'medium', outcome: 'Validate expiring HMAC links.', tags: ['hmac', 'signed-url'], prompt: 'Build Worker that verifies signed URLs with expiration and rejects invalid/tampered links with clean JSON errors.' },
      { title: 'Form Abuse Firewall', level: 'simple', outcome: 'Block spam and bot floods.', tags: ['anti-spam', 'forms'], prompt: 'Create form endpoint with honeypot checks, UA heuristics, and per-IP rate limiting with rejection reasons.' },
      { title: 'Origin Allowlist CORS Proxy', level: 'simple', outcome: 'Enforce strict origin allowlist.', tags: ['cors', 'security'], prompt: 'Build proxy that only allows configured origins, handles preflight requests, and strips unsafe headers.' },
      { title: 'JWT Guard Middleware', level: 'medium', outcome: 'Protect routes with JWT validation.', tags: ['jwt', 'auth'], prompt: 'Create Worker route guard that validates JWT signature/claims and returns detailed auth errors for invalid tokens.' },
      { title: 'Webhook Signature Validator', level: 'simple', outcome: 'Verify signed webhook payloads.', tags: ['webhooks', 'hmac'], prompt: 'Build Worker endpoint that verifies webhook signatures using shared secret and rejects replay/invalid requests.' },
    ],
  },
  {
    title: 'Infra',
    subtitle: 'Operational edge services.',
    examples: [
      { title: 'Webhook Fanout + Retry', level: 'medium', outcome: 'Forward one webhook to many targets.', tags: ['webhooks', 'retries'], prompt: 'Build Worker fanout that forwards payloads to multiple endpoints with timeout handling and retry attempts.' },
      { title: 'Shortlink Service with Expiry', level: 'simple', outcome: 'Serve short links with TTL.', tags: ['shortlinks', 'redirect'], prompt: 'Create shortlink Worker mapping slugs to destination URLs with optional expiration and 410 for expired links.' },
      { title: 'Maintenance Mode Edge Gate', level: 'simple', outcome: 'Toggle maintenance quickly.', tags: ['ops', 'routing'], prompt: 'Build Worker maintenance gate with admin bypass header and fallback maintenance page.' },
      { title: 'Edge Health Aggregator', level: 'simple', outcome: 'Aggregate health of multiple APIs.', tags: ['health', 'monitoring'], prompt: 'Create Worker endpoint that checks multiple upstream health endpoints and returns consolidated status object.' },
      { title: 'Response Cache Layer', level: 'medium', outcome: 'Cache expensive API responses.', tags: ['cache', 'performance'], prompt: 'Build Worker caching layer with key strategy, TTL controls, and bypass query flag.' },
      { title: 'Request Replay Debugger', level: 'medium', outcome: 'Capture and replay failed requests.', tags: ['debug', 'ops'], prompt: 'Create Worker that logs failed request metadata and exposes a secure replay endpoint for diagnostics.' },
    ],
  },
  {
    title: 'AI',
    subtitle: 'Production-ready AI backend patterns.',
    examples: [
      { title: 'AI Response Cache Gateway', level: 'medium', outcome: 'Cache repeated prompts to reduce cost.', tags: ['ai', 'cache'], prompt: 'Build AI gateway Worker that caches completions by model+prompt+options key with TTL and bypass support.' },
      { title: 'Prompt Safety Filter API', level: 'medium', outcome: 'Flag and block unsafe prompts.', tags: ['moderation', 'safety'], prompt: 'Create moderation Worker endpoint that evaluates prompts against blocked patterns and returns policy decision with reasons.' },
      { title: 'Streaming AI Proxy', level: 'medium', outcome: 'Proxy model output as SSE stream.', tags: ['streaming', 'sse'], prompt: 'Build Worker proxy that forwards to upstream model and streams response chunks to client via SSE.' },
      { title: 'Embedding Batch Endpoint', level: 'simple', outcome: 'Generate embeddings for text lists.', tags: ['embeddings', 'api'], prompt: 'Create Worker endpoint that accepts batch text array, calls embedding model, and returns vector payload with validation.' },
      { title: 'Token Usage Meter', level: 'simple', outcome: 'Track per-user token consumption.', tags: ['usage', 'billing'], prompt: 'Build Worker middleware to track model token usage per user and return quota headers in each response.' },
      { title: 'Model Fallback Router', level: 'medium', outcome: 'Fallback to backup model on errors.', tags: ['routing', 'resilience'], prompt: 'Create Worker router that tries primary model and falls back to secondary model on timeout/5xx while preserving response format.' },
    ],
  },
];

function visibleTags(tags: string[]) {
  return tags.slice(0, 2);
}

onMounted(async () => {
  await refresh();
  if (!isAuthed.value) await router.replace('/');
});

async function useExample(prompt: string) {
  description.value = prompt;
  await router.push('/describe');
}

async function backToDescribe() {
  await router.push('/describe');
}
</script>

<style scoped>
.page-content {
  width: 100%;
  max-width: 860px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.hero {
  text-align: center;
}

.hero h1 {
  font-family: var(--sans);
  font-size: 34px;
  font-weight: 800;
  color: var(--tx);
  letter-spacing: -0.035em;
  line-height: 1.1;
}

.hero h1 em {
  font-style: normal;
  color: var(--o);
}

.hero p {
  margin-top: 8px;
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 500;
  color: var(--tm);
}

.top-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.tabs-list {
  width: fit-content;
  max-width: 100%;
}

.tab-trigger {
  min-height: 40px;
}

.tab-content {
  margin-top: 10px;
}

.examples-card {
  border-radius: 14px;
  border-color: var(--bd);
  background: var(--sf);
}

.card-head {
  padding: 14px 14px 10px;
}

.card-title {
  font-family: var(--sans);
  font-size: 18px;
  font-weight: 800;
  color: var(--tx);
}

.card-sub {
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 500;
  color: var(--tm);
}

.card-content {
  padding: 0;
}

.feed-scroll {
  height: calc(5 * 88px + 4px);
}

.feed-list {
  padding: 0 14px 8px;
}

.feed-row {
  height: 88px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.row-left {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.row-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.row-title {
  font-family: var(--sans);
  font-size: 16px;
  font-weight: 800;
  color: var(--tx);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row-outcome {
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 500;
  color: var(--t2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row-tags {
  display: flex;
  gap: 6px;
  overflow: hidden;
}

.level-pill {
  text-transform: lowercase;
}

.use-btn {
  min-width: 86px;
}

.row-sep {
  background: var(--bd);
}

.back-btn {
  min-width: 84px;
}

@media (max-width: 820px) {
  .top-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .tabs-list {
    width: 100%;
  }

  .back-btn {
    width: fit-content;
    align-self: flex-end;
  }
}

@media (max-width: 700px) {
  .hero h1 {
    font-size: 28px;
  }

  .feed-row {
    height: auto;
    min-height: 88px;
    padding: 12px 0;
  }

  .row-title,
  .row-outcome {
    white-space: normal;
  }
}
</style>
