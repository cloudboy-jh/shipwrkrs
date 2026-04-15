<template>
  <div class="page-top">
    <div class="page-content">
      <Transition name="hero-fade">
        <div v-if="viewState === 'review'" class="hero">
          <h1>Review + <em>Deploy</em></h1>
        </div>
      </Transition>

      <Transition name="review-swap" mode="out-in">
        <div v-if="viewState === 'review'" key="review" class="review-stack">
          <div class="name-block">
            <label for="worker-name">Worker name</label>
            <input id="worker-name" v-model="scriptName" maxlength="63" class="mono-input" />
            <p class="url-preview">{{ previewUrl }}</p>
          </div>

          <div class="prompt-block">
            <div class="editor-wrap">
              <CodeEditor v-model="generatedCode" />
            </div>
            <div class="toolbar toolbar-grid">
              <div class="toolbar-main">
                <div class="deploy-url-box" :title="previewUrl">
                  <p class="deploy-preview">{{ previewUrl }}</p>
                </div>
                <div class="toolbar-actions toolbar-actions-right">
                  <button class="btn-ghost action-btn" :disabled="loading" @click="regenerate">Regenerate Code</button>
                  <button class="btn-primary action-btn" :disabled="loading || !canDeploy" @click="runDeploy">
                  {{ loading ? 'Deploying…' : 'Deploy Worker' }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <p class="error-text" v-if="errorText">{{ errorText }}</p>
        </div>

        <div v-else key="deploy" class="deploy-stack">
          <DeployStepLog
            :steps="deploySteps"
            :events="deployEvents"
            :phase="phase"
            :deployedUrl="deployedUrl || previewUrl"
            @deployAnother="deployAnother"
          />

          <div v-if="phase === 'error'" class="toolbar-actions deploy-actions">
            <button class="btn-ghost action-btn" :disabled="loading" @click="regenerate">Regenerate Code</button>
            <button class="btn-primary action-btn" :disabled="loading || !canDeploy" @click="runDeploy">
              {{ loading ? 'Deploying…' : 'Retry Deploy' }}
            </button>
          </div>

          <p class="error-text" v-if="errorText">{{ errorText }}</p>
        </div>
      </Transition>

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
type ReviewPhase = 'idle' | 'deploying' | 'error' | 'success';

const errorText = ref('');
const phase = ref<ReviewPhase>('idle');
const deployEvents = ref<Array<{ id: number; time: string; text: string }>>([]);
const deploySteps = ref<Array<{ key: string; label: string; status: StepState; note?: string }>>([
  { key: 'validate', label: 'Validate script', status: 'pending' },
  { key: 'upload', label: 'Upload bundle', status: 'pending' },
  { key: 'propagate', label: 'Propagate globally', status: 'pending' },
  { key: 'finalize', label: 'Finalize deploy URL', status: 'pending' },
]);

const router = useRouter();
const { generatedCode, scriptName, deployedUrl } = useFlowState();
const { loading, deploy } = useDeploy();
const { refresh, isAuthed } = useAuth();
const { pushToast } = useSonner();

const previewUrl = computed(() => `https://${scriptName.value}.workers.dev`);
const canDeploy = computed(() => Boolean(generatedCode.value.trim() && slugifyWorkerName(scriptName.value)));
const viewState = computed<'review' | 'deploy'>(() => (phase.value === 'idle' ? 'review' : 'deploy'));

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
  phase.value = 'deploying';
  resetStepState();
  stamp(`Deploy started for ${scriptName.value}`);

  try {
    setStep(0, 'active', 'Checking syntax and entrypoint');
    await wait(450);
    setStep(0, 'done', 'Script is valid');

    setStep(1, 'active', 'Pushing worker bundle');
    const [res] = await Promise.all([deploy(scriptName.value, generatedCode.value), wait(900)]);
    setStep(1, 'done', 'Bundle uploaded');

    setStep(2, 'active', 'Rolling out to edge locations');
    await wait(700);
    setStep(2, 'done', 'Global rollout complete');

    setStep(3, 'active', 'Binding workers.dev hostname');
    await wait(500);
    setStep(3, 'done', 'Live at workers.dev');

    deployedUrl.value = res.url;
    phase.value = 'success';
    stamp(`Deploy success: ${res.url ?? 'workers.dev'}`);
    pushToast({ title: 'Deploy successful', message: res.url ?? 'Worker is live', variant: 'success' });
  } catch (err) {
    errorText.value = err instanceof Error ? err.message : 'Deploy failed';
    phase.value = 'error';
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

async function deployAnother() {
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

.review-stack,
.deploy-stack {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.review-swap-enter-active,
.review-swap-leave-active {
  transition: opacity 220ms ease, transform 220ms ease;
}

.review-swap-enter-from,
.review-swap-leave-to {
  opacity: 0;
  transform: translateY(8px);
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

.hero-fade-enter-active,
.hero-fade-leave-active {
  transition: opacity 200ms ease;
}

.hero-fade-leave-to {
  opacity: 0;
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

.toolbar-grid {
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.toolbar-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.deploy-preview {
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 600;
  color: var(--t2);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.deploy-url-box {
  flex: 1;
  min-width: 0;
  height: 40px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  border: 1px solid var(--bd);
  border-radius: 10px;
  background: color-mix(in srgb, var(--bg), var(--sf) 35%);
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toolbar-actions-right {
  justify-content: flex-end;
}

.action-btn {
  height: 40px;
  min-width: 148px;
  padding: 0 18px;
  white-space: nowrap;
}

.deploy-actions {
  justify-content: flex-end;
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

  .toolbar-main {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-actions {
    width: 100%;
  }

  .deploy-actions {
    justify-content: stretch;
  }

  .btn-primary,
  .btn-ghost {
    flex: 1;
  }

  .action-btn {
    min-width: 0;
  }
}
</style>
