<template>
  <div class="deploy-log">
    <p class="title">Deploy steps</p>

    <div class="steps">
      <div class="step" v-for="step in steps" :key="step.key">
        <span class="dot" :class="`s-${step.status}`" aria-hidden="true"></span>
        <div class="step-copy">
          <p class="label">{{ step.label }}</p>
          <p class="note" v-if="step.note">{{ step.note }}</p>
        </div>
      </div>
    </div>

    <div class="events" v-if="events.length">
      <p class="event" v-for="event in events" :key="event.id">
        <span>{{ event.time }}</span>
        <em>{{ event.text }}</em>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
type StepState = 'pending' | 'active' | 'done' | 'error';

defineProps<{
  steps: Array<{ key: string; label: string; status: StepState; note?: string }>;
  events: Array<{ id: number; time: string; text: string }>;
}>();
</script>

<style scoped>
.deploy-log {
  background: var(--sf);
  border: 1px solid var(--bd);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.title {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 700;
  color: var(--t2);
}

.steps {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.step {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  margin-top: 5px;
  border: 1px solid var(--bd);
  background: transparent;
}

.dot.s-pending { background: transparent; }

.dot.s-active {
  background: var(--o);
  border-color: var(--o);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--o), transparent 82%);
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
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.label {
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 600;
  color: var(--tx);
}

.note {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 500;
  color: var(--tm);
}

.events {
  border-top: 1px solid var(--bd);
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.event {
  display: flex;
  gap: 8px;
  align-items: baseline;
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 500;
}

.event span {
  color: var(--tm);
}

.event em {
  color: var(--tx);
  font-style: normal;
}
</style>
