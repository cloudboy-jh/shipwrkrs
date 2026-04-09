<template>
  <section class="stack">
    <UiCard class="stack">
      <h2 class="section-title">Review + Deploy</h2>

      <div class="stack" style="gap: 8px">
        <span class="tiny">Worker name</span>
        <UiInput v-model="scriptName" maxlength="63" />
        <span class="tiny">https://{{ scriptName }}.{{ workersSubdomain }}.workers.dev</span>
      </div>

      <UiSeparator />
      <CodeEditor v-model="generatedCode" />

      <div class="flow-log stack" style="gap: 8px">
        <div class="row" style="justify-content: space-between">
          <span class="tiny">Flow</span>
          <strong class="tiny">{{ stageLabel }}</strong>
        </div>
        <UiProgress :value="stageProgress" />
        <div class="log-line" v-for="entry in logEntries" :key="entry.id">
          <span class="tiny">{{ entry.time }}</span>
          <span>{{ entry.text }}</span>
        </div>
      </div>

      <div class="row wrap">
        <UiButton variant="primary" size="lg" :disabled="loading" @click="confirmOpen = true">
          {{ loading ? 'Deploying...' : 'Deploy' }}
        </UiButton>
        <UiButton variant="secondary" size="lg" :disabled="loading" @click="regenerate">
          Regenerate
        </UiButton>
      </div>

      <UiAlert variant="error" v-if="errorText">{{ errorText }}</UiAlert>
    </UiCard>

    <UiDialog :open="confirmOpen" @update:open="confirmOpen = $event">
      <div class="stack">
        <h3 style="margin: 0">Deploy this Worker?</h3>
        <p class="muted" style="margin: 0">Script: {{ scriptName }}</p>
        <div class="row" style="justify-content: flex-end">
          <UiButton variant="ghost" @click="confirmOpen = false">Cancel</UiButton>
          <UiButton variant="primary" @click="runDeploy">Deploy now</UiButton>
        </div>
      </div>
    </UiDialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import CodeEditor from '../components/CodeEditor.vue';
import UiAlert from '../components/ui/Alert.vue';
import UiButton from '../components/ui/Button.vue';
import UiCard from '../components/ui/Card.vue';
import UiDialog from '../components/ui/Dialog.vue';
import UiInput from '../components/ui/Input.vue';
import UiProgress from '../components/ui/Progress.vue';
import UiSeparator from '../components/ui/Separator.vue';
import { useSonner } from '../components/ui/sonner';
import { useAuth } from '../composables/useAuth';
import { useDeploy } from '../composables/useDeploy';
import { useFlowState, slugifyWorkerName } from '../composables/useFlowState';

const errorText = ref('');
const confirmOpen = ref(false);
const stage = ref<'generated' | 'ready' | 'deploying' | 'live' | 'failed'>('generated');
const logEntries = ref<Array<{ id: number; time: string; text: string }>>([]);
const router = useRouter();
const { generatedCode, scriptName, deployedUrl } = useFlowState();
const { loading, deploy } = useDeploy();
const { refresh, isAuthed, user } = useAuth();
const { pushToast } = useSonner();

const workersSubdomain = computed(() => user.value?.id || 'your-subdomain');
const stageLabel = computed(() => {
  if (stage.value === 'generated') return 'Generated';
  if (stage.value === 'ready') return 'Ready to deploy';
  if (stage.value === 'deploying') return 'Deploying';
  if (stage.value === 'live') return 'Live';
  return 'Failed';
});
const stageProgress = computed(() => {
  if (stage.value === 'generated') return 35;
  if (stage.value === 'ready') return 55;
  if (stage.value === 'deploying') return 85;
  if (stage.value === 'live') return 100;
  return 55;
});

function stamp(text: string) {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  logEntries.value.unshift({ id: Date.now() + Math.floor(Math.random() * 1000), time, text });
  logEntries.value = logEntries.value.slice(0, 4);
}

onMounted(async () => {
  await refresh();
  if (!isAuthed.value) {
    await router.replace('/');
    return;
  }
  if (!generatedCode.value.trim()) await router.replace('/describe');
  stage.value = 'ready';
  stamp('Worker code generated and loaded.');
});

async function runDeploy() {
  if (!generatedCode.value.trim()) {
    errorText.value = 'No code to deploy';
    confirmOpen.value = false;
    return;
  }
  scriptName.value = slugifyWorkerName(scriptName.value);
  if (!scriptName.value) {
    errorText.value = 'Worker name is required';
    confirmOpen.value = false;
    return;
  }

  errorText.value = '';
  confirmOpen.value = false;
  stage.value = 'deploying';
  stamp('Deploy request started.');
  try {
    const res = await deploy(scriptName.value, generatedCode.value);
    deployedUrl.value = res.url;
    stage.value = 'live';
    stamp(`Worker deployed to ${res.url ?? 'workers.dev'}.`);
    pushToast({ title: 'Deploy successful', message: res.url ?? 'Worker is live', variant: 'success' });
    await router.push('/success');
  } catch (err) {
    errorText.value = err instanceof Error ? err.message : 'Deploy failed';
    stage.value = 'failed';
    stamp(`Deploy failed: ${errorText.value}`);
    pushToast({ title: 'Deploy failed', message: errorText.value, variant: 'error' });
  }
}

async function regenerate() {
  stage.value = 'generated';
  stamp('Returned to describe screen for regeneration.');
  await router.push('/describe');
}
</script>

<style scoped>
.flow-log {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #0f1317;
  padding: 10px;
}

.log-line {
  display: flex;
  gap: 10px;
  align-items: center;
  color: var(--text-secondary);
  font-size: 13px;
}
</style>
