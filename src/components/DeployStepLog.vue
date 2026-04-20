<template>
  <div class="deploy-log" :class="{ 'success-state': phase === 'success' }">
    <Transition name="success-pop">
      <div v-if="phase === 'success'" class="success-content">
        <div class="success-head">
          <div class="check-circle"><CheckCircle2 :size="24" aria-hidden="true" /></div>
          <p class="success-title">Worker deployed</p>
        </div>
        <a class="success-url" :href="dashboardUrl" target="_blank" rel="noreferrer">
          <span class="url-text">Open in Cloudflare Dashboard</span>
          <ExternalLink :size="16" class="url-icon" aria-hidden="true" />
        </a>
        <p class="domain-help">Manage Domains & Routes and activate workers.dev/custom domain if it shows inactive.</p>
        <p v-if="liveUrl" class="live-url-row">
          <span>Live URL</span>
          <a :href="liveUrl" target="_blank" rel="noreferrer">{{ liveUrl }}</a>
        </p>
        <button class="deploy-another-link" type="button" @click="$emit('deployAnother')">Deploy another →</button>
      </div>
    </Transition>

    <Tabs default-value="steps" class="log-tabs">
      <div class="log-head">
        <div>
          <p class="title">{{ phase === 'error' ? 'Deploy failed' : 'Deploy progress' }}</p>
          <p class="subtitle">{{ doneCount }}/{{ steps.length }} steps complete</p>
        </div>
        <TabsList class="tab-list">
          <TabsTrigger value="steps" class="tab-trigger">Steps</TabsTrigger>
          <TabsTrigger value="log" class="tab-trigger">Log</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="steps" class="tab-panel">
        <div class="steps">
          <div class="step" v-for="step in steps" :key="step.key">
            <span class="dot" :class="`s-${step.status}`" aria-hidden="true"></span>
            <div class="step-copy">
              <div class="step-head">
                <p class="label">{{ step.label }}</p>
                <span class="state-pill" :class="`p-${step.status}`">{{ stateText(step.status) }}</span>
              </div>
              <p class="note" v-if="step.note">{{ step.note }}</p>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="log" class="tab-panel">
        <div class="events" v-if="events.length">
          <p class="event" v-for="event in events" :key="event.id">
            <span>{{ event.time }}</span>
            <em>{{ event.text }}</em>
          </p>
        </div>
        <p v-else class="empty">Log entries appear here during deploy.</p>
      </TabsContent>
    </Tabs>
  </div>
</template>

<script setup lang="ts">
import { CheckCircle2, ExternalLink } from 'lucide-vue-next';
import { computed } from 'vue';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type StepState = 'pending' | 'active' | 'done' | 'error';
type Phase = 'idle' | 'deploying' | 'error' | 'success';

const props = defineProps<{
  steps: Array<{ key: string; label: string; status: StepState; note?: string }>;
  events: Array<{ id: number; time: string; text: string }>;
  phase: Phase;
  dashboardUrl: string;
  liveUrl?: string | null;
}>();

defineEmits<{
  (e: 'deployAnother'): void;
}>();

const doneCount = computed(() => props.steps.filter((step) => step.status === 'done').length);

function stateText(state: StepState) {
  if (state === 'active') return 'Running';
  if (state === 'done') return 'Done';
  if (state === 'error') return 'Error';
  return 'Queued';
}
</script>

<style scoped>
.deploy-log {
  background: var(--sf);
  border: 1px solid var(--bd);
  border-radius: 12px;
  padding: 16px;
}

.deploy-log.success-state {
  border-color: color-mix(in srgb, var(--gn), transparent 58%);
  background: color-mix(in srgb, var(--gn), transparent 95%);
}

.success-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.success-pop-enter-active,
.success-pop-leave-active {
  transition: opacity 220ms ease, transform 220ms ease;
}

.success-pop-enter-from,
.success-pop-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.985);
}

.success-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;
}

.check-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 2px solid var(--gn);
  background: color-mix(in srgb, var(--gn), transparent 88%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--gn);
}

.success-title {
  font-family: var(--sans);
  font-size: 28px;
  font-weight: 800;
  color: var(--gn);
  letter-spacing: -0.03em;
}

.success-url {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 14px;
  border: 1px solid color-mix(in srgb, var(--gn), var(--bd) 72%);
  border-radius: 12px;
  background: var(--sf);
  text-decoration: none;
  color: var(--tx);
  transition: border-color 150ms ease, background 150ms ease;
}

.success-url:hover {
  border-color: var(--gn);
  background: color-mix(in srgb, var(--gn), transparent 92%);
}

.url-text {
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.domain-help {
  text-align: center;
  max-width: 680px;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--tm);
}

.live-url-row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--tm);
}

.live-url-row a {
  color: var(--t2);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.live-url-row a:hover {
  color: var(--tx);
}

.url-icon {
  flex-shrink: 0;
  color: var(--gn);
}

.deploy-another-link {
  background: none;
  border: none;
  padding: 0;
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 600;
  color: var(--t2);
  cursor: pointer;
  margin-top: 4px;
  transition: color 120ms ease;
}

.deploy-another-link:hover {
  color: var(--tx);
}

.log-tabs {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.log-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.title {
  font-family: var(--mono);
  font-size: 14px;
  font-weight: 700;
  color: var(--t2);
}

.subtitle {
  margin-top: 3px;
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 600;
  color: var(--tm);
}

.tab-list {
  height: 40px;
  padding: 4px;
}

.tab-trigger {
  min-width: 92px;
  min-height: 30px;
  font-size: 13px;
  font-weight: 600;
}

.tab-panel {
  margin-top: 0;
}

.steps {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.step {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-height: 84px;
  padding: 14px 14px 14px 10px;
  border: 1px solid color-mix(in srgb, var(--bd), transparent 25%);
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg), var(--sf) 24%);
}

.step:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 13px;
  top: 28px;
  bottom: -16px;
  width: 1px;
  background: color-mix(in srgb, var(--tx), transparent 88%);
}

.dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  margin-top: 6px;
  border: 1px solid var(--bd);
  background: transparent;
  flex: 0 0 auto;
}

.dot.s-pending { background: transparent; }

.dot.s-active {
  background: var(--o);
  border-color: var(--o);
  box-shadow: 0 0 0 5px color-mix(in srgb, var(--o), transparent 85%);
}

.dot.s-done {
  background: var(--gn);
  border-color: var(--gn);
}

.dot.s-error {
  background: var(--er);
  border-color: var(--er);
}

.step-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.step-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.label {
  font-family: var(--mono);
  font-size: 16px;
  font-weight: 700;
  color: var(--tx);
}

.state-pill {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
  padding: 4px 10px;
  border: 1px solid var(--bd);
  color: var(--t2);
  white-space: nowrap;
}

.state-pill.p-active {
  color: #000;
  background: var(--o);
  border-color: var(--o);
}

.state-pill.p-done {
  color: var(--gn);
  border-color: color-mix(in srgb, var(--gn), transparent 56%);
  background: color-mix(in srgb, var(--gn), transparent 90%);
}

.state-pill.p-error {
  color: var(--er);
  border-color: color-mix(in srgb, var(--er), transparent 56%);
  background: color-mix(in srgb, var(--er), transparent 90%);
}

.note {
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 500;
  color: var(--t2);
}

.events {
  max-height: min(42vh, 420px);
  overflow: auto;
  border: 1px solid var(--bd);
  border-radius: 10px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: color-mix(in srgb, var(--bg), var(--sf) 40%);
}

.event {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  align-items: baseline;
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 500;
}

.event span {
  color: var(--tm);
}

.event em {
  color: var(--tx);
  font-style: normal;
}

.empty {
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 500;
  color: var(--tm);
  padding: 12px 0;
}

@media (max-width: 700px) {
  .log-head {
    flex-direction: column;
    align-items: stretch;
  }

  .tab-list {
    width: 100%;
  }

  .tab-trigger {
    flex: 1;
  }

  .step-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }

  .success-title {
    font-size: 24px;
  }
}
</style>
