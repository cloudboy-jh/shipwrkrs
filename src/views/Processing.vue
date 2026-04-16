<template>
  <div class="page-center">
    <div class="page-content">
      <div class="hero">
        <h1>Generating <em>Worker code</em></h1>
        <p>{{ currentLine }}</p>
      </div>

      <div class="prompt-block">
        <div class="thinking-wrap">
          <div class="thinking-bars" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>

      <p class="error-text" v-if="errorText">{{ errorText }}</p>

      <button class="btn-ghost" v-if="errorText" @click="goBack">Back to describe</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import { useFlowState } from '../composables/useFlowState';
import { useGenerate } from '../composables/useGenerate';

const router = useRouter();
const { refresh, isAuthed } = useAuth();
const { generate } = useGenerate();
const { description, generatedCode } = useFlowState();

const errorText = ref('');
const statusIndex = ref(0);
let ticker: ReturnType<typeof setInterval> | null = null;

const lines = ['Parsing prompt', 'Planning worker logic', 'Writing worker code'];
const currentLine = computed(() => lines[statusIndex.value]);

onMounted(async () => {
  await refresh();
  if (!isAuthed.value) {
    await router.replace('/');
    return;
  }

  if (!description.value.trim()) {
    await router.replace('/describe');
    return;
  }

  ticker = setInterval(() => {
    statusIndex.value = (statusIndex.value + 1) % lines.length;
  }, 700);

  const tierRaw = sessionStorage.getItem('shipwrkrs:tier');
  const tier = tierRaw === 'premium' ? 'premium' : 'free';

  const started = performance.now();

  try {
    const res = await generate(description.value.trim(), tier);
    const elapsed = performance.now() - started;
    if (elapsed < 700) {
      await new Promise((resolve) => setTimeout(resolve, 700 - elapsed));
    }

    generatedCode.value = res.code;
    await router.replace('/review');
  } catch (err) {
    errorText.value = err instanceof Error ? err.message : 'Generation failed';
  } finally {
    sessionStorage.removeItem('shipwrkrs:tier');
  }
});

onBeforeUnmount(() => {
  if (ticker) clearInterval(ticker);
});

async function goBack() {
  await router.replace('/describe');
}
</script>

<style scoped>
.page-content {
  width: 100%;
  max-width: 580px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  align-items: center;
}

.hero {
  text-align: center;
}

.hero h1 {
  font-family: var(--sans);
  font-size: 36px;
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
  margin-top: 10px;
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 600;
  color: var(--tm);
}

.prompt-block {
  width: 100%;
}

.thinking-wrap {
  min-height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.thinking-bars {
  display: flex;
  align-items: end;
  gap: 6px;
  height: 16px;
}

.thinking-bars span {
  width: 6px;
  background: var(--o);
  border-radius: 999px;
  animation: bars 900ms ease-in-out infinite;
}

.thinking-bars span:nth-child(1) { animation-delay: 0ms; }
.thinking-bars span:nth-child(2) { animation-delay: 120ms; }
.thinking-bars span:nth-child(3) { animation-delay: 240ms; }

.error-text {
  text-align: center;
  color: var(--er);
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 600;
}

@keyframes bars {
  0%, 100% { height: 6px; opacity: 0.5; }
  50% { height: 16px; opacity: 1; }
}

@media (max-width: 600px) {
  .hero h1 { font-size: 28px; }
}
</style>
