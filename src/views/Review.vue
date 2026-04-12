<template>
  <div class="page-top">
    <div class="page-content">
      <div class="hero">
        <h1>Review + <em>Deploy</em></h1>
      </div>

      <div class="name-block">
        <label for="worker-name">Worker name</label>
        <input id="worker-name" v-model="scriptName" maxlength="63" class="mono-input" />
        <p class="url-preview">{{ previewUrl }}</p>
      </div>

      <div class="prompt-block">
        <div class="editor-wrap">
          <CodeEditor v-model="generatedCode" />
        </div>
        <div class="toolbar">
          <p class="deploy-preview">{{ previewUrl }}</p>
          <div class="toolbar-actions">
            <button class="btn-primary" :disabled="loading" @click="runDeploy">
              {{ loading ? 'Deploying...' : 'Deploy' }}
            </button>
            <button class="btn-ghost" :disabled="loading" @click="regenerate">Regenerate</button>
          </div>
        </div>
      </div>

      <DeployStepLog :steps="deploySteps" :events="deployEvents" />

      <p class="error-text" v-if="errorText">{{ errorText }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import CodeEditor from '../components/CodeEditor.vue';
import DeployStepLog from '../components/DeployStepLog.vue';
import { useSonner } from '../components/ui/sonner';
import { useAuth } from '../composables/useAuth';
import { useDeploy } from '../composables/useDeploy';
import { useFlowState, slugifyWorkerName } from '../composables/useFlowState';

type StepState = 'pending' | 'active' | 'done' | 'error';

const errorText = ref('');
const deployEvents = ref<Array<{ id: number; time: string; text: string }>>([]);
const deploySteps = ref<Array<{ key: string; label: string; status: StepState; note?: string }>>([
  { key: 'validate', label: 'Validate worker script', status: 'pending' },
  { key: 'upload', label: 'Upload worker', status: 'pending' },
  { key: 'propagate', label: 'Propagate to edge', status: 'pending' },
  { key: 'finalize', label: 'Finalize deploy URL', status: 'pending' },
]);

const router = useRouter();
const { generatedCode, scriptName, deployedUrl } = useFlowState();
const { loading, deploy } = useDeploy();
const { refresh, isAuthed } = useAuth();
const { pushToast } = useSonner();

const previewUrl = computed(() => `https://${scriptName.value}.workers.dev`);

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stamp(text: string) {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  deployEvents.value.unshift({ id: Date.now() + Math.floor(Math.random() * 1000), time, text });
  deployEvents.value = deployEvents.value.slice(0, 6);
}

function resetStepState() {
  deploySteps.value = deploySteps.value.map((step) => ({ ...step, status: 'pending', note: '' }));
}

function setStep(index: number, status: StepState, note?: string) {
  deploySteps.value = deploySteps.value.map((step, i) => (i === index ? { ...step, status, note } : step));
}

function markRemainingPendingFrom(index: number) {
  deploySteps.value = deploySteps.value.map((step, i) =>
    i >= index && step.status !== 'done' ? { ...step, status: 'pending', note: '' } : step,
  );
}

onMounted(async () => {
  await refresh();
  if (!isAuthed.value) {
    await router.replace('/');
    return;
  }
  if (!generatedCode.value.trim()) await router.replace('/describe');
});

async function runDeploy() {
  if (!generatedCode.value.trim()) {
    errorText.value = 'No code to deploy';
    return;
  }

  scriptName.value = slugifyWorkerName(scriptName.value);
  if (!scriptName.value) {
    errorText.value = 'Worker name is required';
    return;
  }

  errorText.value = '';
  resetStepState();
  stamp(`Deploy started for ${scriptName.value}`);

  try {
    setStep(0, 'active', 'Checking script + name');
    await wait(450);
    setStep(0, 'done', 'Validation complete');

    setStep(1, 'active', 'Publishing worker bundle');
    const [res] = await Promise.all([deploy(scriptName.value, generatedCode.value), wait(900)]);
    setStep(1, 'done', 'Upload complete');

    setStep(2, 'active', 'Rolling out globally');
    await wait(700);
    setStep(2, 'done', 'Edge propagation complete');

    setStep(3, 'active', 'Resolving workers.dev URL');
    await wait(500);
    setStep(3, 'done', 'Ready');

    deployedUrl.value = res.url;
    stamp(`Deploy success: ${res.url ?? 'workers.dev'}`);
    pushToast({ title: 'Deploy successful', message: res.url ?? 'Worker is live', variant: 'success' });
    await router.push('/success');
  } catch (err) {
    errorText.value = err instanceof Error ? err.message : 'Deploy failed';
    const activeIndex = deploySteps.value.findIndex((step) => step.status === 'active');
    if (activeIndex >= 0) {
      setStep(activeIndex, 'error', errorText.value);
      markRemainingPendingFrom(activeIndex + 1);
    }
    stamp(`Deploy failed: ${errorText.value}`);
    pushToast({ title: 'Deploy failed', message: errorText.value, variant: 'error' });
  }
}

async function regenerate() {
  await router.push('/describe');
}
</script>

<style scoped>
.page-content {
  width: 100%;
  max-width: 960px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.hero {
  text-align: center;
  margin-bottom: 4px;
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

.name-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.name-block label {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--t2);
}

.mono-input {
  width: 100%;
  height: 42px;
  background: var(--el);
  border: 1px solid var(--bd);
  border-radius: 10px;
  color: var(--tx);
  padding: 0 12px;
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 600;
  outline: none;
}

.url-preview {
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 500;
  color: var(--tm);
}

.editor-wrap {
  padding: 14px;
}

.toolbar {
  gap: 14px;
}

.deploy-preview {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--tm);
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-primary:disabled,
.btn-ghost:disabled {
  opacity: 0.5;
  pointer-events: none;
}

.error-text {
  color: var(--er);
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 600;
}

@media (max-width: 860px) {
  .hero h1 {
    font-size: 30px;
  }

  .toolbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .toolbar-actions {
    width: 100%;
  }

  .btn-primary,
  .btn-ghost {
    flex: 1;
  }
}
</style>
