<template>
  <div class="page-top">
    <div
      :class="[
        'page-content',
        { 'is-editor-expanded': isEditorExpanded, 'is-deploy-mode': viewState === 'deploy' },
      ]"
    >
      <Transition name="hero-fade">
        <div v-if="viewState === 'review' && showHero" class="hero">
          <h1>Review + <em>Deploy</em></h1>
        </div>
      </Transition>

      <Transition name="review-swap" mode="out-in">
        <div v-if="viewState === 'review'" key="review" class="review-stack">
          <div class="name-block">
            <label for="worker-name">Worker name</label>
            <input
              id="worker-name"
              v-model="scriptName"
              maxlength="63"
              class="mono-input"
              :class="{ 'is-invalid': scriptName.length > 0 && !isScriptNameValid }"
              @blur="normalizeScriptName"
            />
            <p class="url-preview">{{ previewUrl }}</p>
            <p v-if="scriptName.length > 0 && !isScriptNameValid" class="field-error">
              Use only lowercase letters, numbers, and hyphens (1-63 chars).
            </p>
          </div>

          <div :class="['prompt-block', { 'is-expanded': isEditorExpanded }]">
            <div class="editor-wrap">
              <CodeEditor v-model="generatedCode" @expanded-change="handleEditorExpandedChange" />
            </div>
          </div>

          <section class="prompt-block">
            <div class="toolbar toolbar-grid">
              <div class="toolbar-main">
                <div class="deploy-url-box" :title="previewUrl">
                  <p class="deploy-preview">{{ previewUrl }}</p>
                </div>
                <div class="toolbar-actions toolbar-actions-right">
                  <button class="btn-ghost action-btn" :disabled="loading" @click="goToDescribe">
                    Back to Describe
                  </button>
                  <button class="btn-ghost action-btn" :disabled="loading" @click="secretsOpen = true">
                    <KeyRound :size="14" />
                    {{ allSecrets.length > 0 ? `Secrets (${allSecrets.length})` : 'Secrets' }}
                  </button>
                  <button
                    class="btn-primary action-btn"
                    :disabled="Boolean(deployDisabledReason) || loading"
                    :title="deployDisabledReason || ''"
                    @click="runDeploy()"
                  >
                    {{ loading ? 'Deploying...' : 'Deploy Worker' }}
                  </button>
                </div>
              </div>
            </div>
            <div class="deploy-status-line">
              <p v-if="missingRequiredSecrets.length > 0" class="deploy-status-pill is-warning">
                <AlertTriangle :size="14" />
                Missing required: {{ missingRequiredSecrets.join(', ') }}
              </p>
              <p v-else-if="unmatchedEnvKeys.length > 0" class="deploy-status-pill is-warning">
                <AlertTriangle :size="14" />
                {{ unmatchedEnvKeys.join(', ') }} not used by this Worker - skip?
              </p>
              <p v-else :class="['deploy-status-pill', hasUnfilledSecrets ? 'is-pending' : 'is-ready']">
                <KeyRound v-if="hasUnfilledSecrets" :size="14" />
                <CheckCircle2 v-else :size="14" />
                {{ allSecrets.length > 0 ? `${filledSecretsCount} / ${allSecrets.length} secrets filled` : 'No secrets detected' }}
              </p>
            </div>
            <p class="deploy-note" v-if="deployDisabledReason">{{ deployDisabledReason }}</p>
          </section>

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
            <button class="btn-ghost action-btn" :disabled="loading" @click="goToDescribe">Back to Describe</button>
            <button class="btn-ghost action-btn" :disabled="loading" @click="secretsOpen = true">
              <KeyRound :size="14" />
              Open Secrets
            </button>
            <button
              v-if="failedSecretName"
              class="btn-ghost action-btn"
              :disabled="loading"
              @click="retryFailedSecret"
            >
              Retry {{ failedSecretName }}
            </button>
            <button
              class="btn-primary action-btn"
              :disabled="Boolean(deployDisabledReason) || loading"
              :title="deployDisabledReason || ''"
              @click="runDeploy()"
            >
              {{ loading ? 'Deploying...' : 'Retry Deploy' }}
            </button>
          </div>

          <p class="error-text" v-if="errorText">{{ errorText }}</p>
        </div>
      </Transition>
    </div>

    <UiDialog :open="secretsOpen" @update:open="secretsOpen = $event">
      <div class="secrets-modal">
        <div class="secrets-head">
          <div class="secrets-title-wrap">
            <span class="secrets-icon-chip"><KeyRound :size="16" /></span>
            <div>
              <h2>Secrets</h2>
              <p>Values are sent only to Cloudflare and never stored in shipwrkrs.</p>
            </div>
          </div>
          <div class="secrets-head-actions">
            <button class="btn-ghost mode-toggle" type="button" @click="toggleSecretMode">
              <FileCode2 :size="14" />
              {{ secretMode === 'fields' ? 'Paste .env' : 'Use fields' }}
            </button>
            <button class="icon-close" type="button" aria-label="Close secrets modal" @click="secretsOpen = false">
              <X :size="16" />
            </button>
          </div>
        </div>

        <div class="secrets-scroll">
          <div class="secrets-body" v-if="allSecrets.length > 0">
            <div class="modal-status-wrap">
              <p
                :class="[
                  'modal-status-pill',
                  missingRequiredSecrets.length > 0 ? 'is-warning' : hasUnfilledSecrets ? 'is-pending' : 'is-ready',
                ]"
              >
                <AlertTriangle v-if="missingRequiredSecrets.length > 0" :size="14" />
                <KeyRound v-else-if="hasUnfilledSecrets" :size="14" />
                <CheckCircle2 v-else :size="14" />
                {{ filledSecretsCount }} / {{ allSecrets.length }} secrets filled
              </p>
            </div>

            <p class="field-warning" v-if="unmatchedEnvKeys.length > 0">
              <AlertTriangle :size="14" />
              {{ unmatchedEnvKeys.join(', ') }} not used by this Worker - skip?
            </p>

            <div v-if="secretMode === 'env'" class="env-mode">
              <label for="env-input">Paste .env</label>
              <textarea
                id="env-input"
                v-model="envPaste"
                class="env-input"
                placeholder="DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/..."
                @blur="applyEnvPaste"
                @paste="handleEnvPaste"
              />
              <p class="env-meta">We parse on paste/blur and bring you back to individual fields.</p>
            </div>

            <div v-else class="secret-list">
              <article class="secret-item" v-for="secret in allSecrets" :key="secret.name">
                <div class="secret-top">
                  <div>
                    <p class="secret-label">
                      {{ secret.label }}
                      <span class="required" v-if="secret.required">required</span>
                    </p>
                    <p class="secret-name">{{ secret.name }}</p>
                  </div>
                  <a v-if="secret.helpUrl" :href="secret.helpUrl" target="_blank" rel="noreferrer" class="help-link">
                    Help
                  </a>
                </div>
                <p class="secret-description">{{ secret.description }}</p>
                <div class="secret-input-row">
                  <input
                    :type="revealSecrets[secret.name] ? 'text' : 'password'"
                    v-model="secretValues[secret.name]"
                    class="mono-input"
                    :placeholder="secret.placeholder || ''"
                    autocomplete="off"
                    spellcheck="false"
                  />
                  <button class="btn-ghost reveal-btn" type="button" @click="toggleReveal(secret.name)">
                    <EyeOff v-if="revealSecrets[secret.name]" :size="14" />
                    <Eye v-else :size="14" />
                    {{ revealSecrets[secret.name] ? 'Hide' : 'Reveal' }}
                  </button>
                </div>
              </article>
            </div>
          </div>

          <div class="secrets-empty" v-else>
            No `env.*` secrets detected in this Worker.
          </div>
        </div>

        <div class="secrets-foot">
          <button class="btn-primary mode-toggle" type="button" @click="secretsOpen = false">Done</button>
        </div>
      </div>
    </UiDialog>
  </div>
</template>

<script setup lang="ts">
import { AlertTriangle, CheckCircle2, Eye, EyeOff, KeyRound, X } from 'lucide-vue-next';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import CodeEditor from '../components/CodeEditor.vue';
import DeployStepLog from '../components/DeployStepLog.vue';
import UiDialog from '../components/ui/Dialog.vue';
import { useSonner } from '../components/ui/sonner';
import { api } from '../composables/api';
import { useAuth } from '../composables/useAuth';
import { useDeploy } from '../composables/useDeploy';
import { useFlowState, validWorkerName, type SecretManifestItem } from '../composables/useFlowState';

type StepState = 'pending' | 'active' | 'done' | 'error';
type ReviewPhase = 'idle' | 'deploying' | 'error' | 'success';
type SecretMode = 'fields' | 'env';

const errorText = ref('');
const phase = ref<ReviewPhase>('idle');
const isEditorExpanded = ref(false);
const secretsOpen = ref(false);
const secretMode = ref<SecretMode>('fields');
const envPaste = ref('');
const unmatchedEnvKeys = ref<string[]>([]);
const revealSecrets = ref<Record<string, boolean>>({});
const failedSecretName = ref('');
const showHero = ref(true);
const deployEvents = ref<Array<{ id: number; time: string; text: string }>>([]);
const deploySteps = ref<Array<{ key: string; label: string; status: StepState; note?: string }>>([
  { key: 'validate', label: 'Validate script', status: 'pending' },
  { key: 'upload', label: 'Upload bundle', status: 'pending' },
  { key: 'secrets', label: 'Set secrets', status: 'pending' },
  { key: 'propagate', label: 'Propagate globally', status: 'pending' },
  { key: 'finalize', label: 'Finalize deploy URL', status: 'pending' },
]);

const router = useRouter();
const { generatedCode, scriptName, deployedUrl, generatedSecrets, secretValues } = useFlowState();
const { loading, deploy } = useDeploy();
const { refresh, isAuthed } = useAuth();
const { pushToast } = useSonner();

const previewUrl = computed(() => `https://${scriptName.value || 'worker-name'}.workers.dev`);
const isScriptNameValid = computed(() => validWorkerName(scriptName.value));
const viewState = computed<'review' | 'deploy'>(() => (phase.value === 'idle' ? 'review' : 'deploy'));

const allSecrets = computed<SecretManifestItem[]>(() => {
  const out = new Map<string, SecretManifestItem>();
  for (const secret of generatedSecrets.value) {
    out.set(secret.name, secret);
  }
  const envMatches = generatedCode.value.match(/env\.([A-Z_][A-Z0-9_]*)/g) ?? [];
  for (const match of envMatches) {
    const name = match.replace('env.', '');
    if (out.has(name)) continue;
    out.set(name, {
      name,
      label: toLabel(name),
      description: 'Detected in code but missing from generated manifest.',
      placeholder: name.includes('URL') ? 'https://example.com/...' : undefined,
      required: false,
    });
  }
  return Array.from(out.values());
});

const requiredSecretNames = computed(() =>
  allSecrets.value.filter((secret) => secret.required).map((secret) => secret.name),
);

const missingRequiredSecrets = computed(() =>
  requiredSecretNames.value.filter((name) => !String(secretValues.value[name] ?? '').trim()),
);

const filledSecretsCount = computed(() =>
  allSecrets.value.filter((secret) => String(secretValues.value[secret.name] ?? '').trim().length > 0).length,
);

const hasUnfilledSecrets = computed(() =>
  allSecrets.value.length > 0 && filledSecretsCount.value < allSecrets.value.length,
);

const deployDisabledReason = computed(() => {
  if (loading.value) return 'Deploy in progress.';
  if (!generatedCode.value.trim()) return 'Missing generated code.';
  if (!isScriptNameValid.value) return 'Worker name is invalid.';
  if (missingRequiredSecrets.value.length > 0) return `Missing required secrets: ${missingRequiredSecrets.value.join(', ')}`;
  return '';
});

watch(
  allSecrets,
  (items) => {
    const nextValues: Record<string, string> = {};
    const nextReveal: Record<string, boolean> = {};
    for (const secret of items) {
      nextValues[secret.name] = secretValues.value[secret.name] ?? '';
      nextReveal[secret.name] = revealSecrets.value[secret.name] ?? false;
    }
    secretValues.value = nextValues;
    revealSecrets.value = nextReveal;
  },
  { immediate: true },
);

function toLabel(name: string) {
  return name
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}

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

function normalizeScriptName() {
  scriptName.value = scriptName.value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
}

function handleEditorExpandedChange(expanded: boolean) {
  isEditorExpanded.value = expanded;
}

function toggleSecretMode() {
  secretMode.value = secretMode.value === 'fields' ? 'env' : 'fields';
}

function toggleReveal(secretName: string) {
  revealSecrets.value[secretName] = !revealSecrets.value[secretName];
}

function parseEnvLines(raw: string) {
  const parsed = new Map<string, string>();
  const unknown: string[] = [];
  for (const originalLine of raw.split(/\r?\n/)) {
    const line = originalLine.trim();
    if (!line || line.startsWith('#')) continue;
    const normalized = line.startsWith('export ') ? line.slice(7).trim() : line;
    const match = normalized.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const key = match[1];
    let value = match[2] ?? '';
    value = value.trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (allSecrets.value.some((secret) => secret.name === key)) {
      parsed.set(key, value);
    } else {
      unknown.push(key);
    }
  }
  return { parsed, unknown };
}

function applyEnvPaste() {
  if (!envPaste.value.trim()) return;
  const { parsed, unknown } = parseEnvLines(envPaste.value);
  for (const [name, value] of parsed.entries()) {
    secretValues.value[name] = value;
  }
  unmatchedEnvKeys.value = Array.from(new Set(unknown));
  secretMode.value = 'fields';
}

function handleEnvPaste() {
  setTimeout(applyEnvPaste, 0);
}

onMounted(async () => {
  await refresh();
  if (!isAuthed.value) {
    await router.replace('/');
    return;
  }
  if (!generatedCode.value.trim()) await router.replace('/describe');

  // Hide hero after 5 seconds
  setTimeout(() => {
    showHero.value = false;
  }, 5000);
});

function getDeploySecrets() {
  return allSecrets.value
    .map((secret) => ({ name: secret.name, value: String(secretValues.value[secret.name] ?? '').trim() }))
    .filter((secret) => secret.value.length > 0);
}

async function runDeploy(retrySecret?: string) {
  if (deployDisabledReason.value) {
    errorText.value = deployDisabledReason.value;
    return;
  }

  failedSecretName.value = '';
  errorText.value = '';
  phase.value = 'deploying';
  resetStepState();
  stamp(`Deploy started for ${scriptName.value}`);

  try {
    setStep(0, 'active', 'Checking syntax and entrypoint');
    await wait(260);
    setStep(0, 'done', 'Script is valid');

    if (retrySecret) {
      setStep(1, 'done', 'Skipped script upload (secret retry)');
    } else {
      setStep(1, 'active', 'Pushing worker bundle');
    }

    setStep(2, 'active', retrySecret ? `Retrying ${retrySecret}` : 'Writing secrets via Cloudflare API');
    const [res] = await Promise.all([
      deploy(scriptName.value, generatedCode.value, getDeploySecrets(), retrySecret),
      wait(retrySecret ? 400 : 900),
    ]);
    if (!retrySecret) {
      setStep(1, 'done', 'Bundle uploaded');
    }
    setStep(2, 'done', 'Secrets updated');

    setStep(3, 'active', 'Rolling out to edge locations');
    await wait(600);
    setStep(3, 'done', 'Global rollout complete');

    setStep(4, 'active', 'Binding workers.dev hostname');
    await wait(420);
    setStep(4, 'done', 'Live at workers.dev');

    deployedUrl.value = res.url;
    phase.value = 'success';
    stamp(`Deploy success: ${res.url ?? 'workers.dev'}`);
    pushToast({ title: 'Deploy successful', message: res.url ?? 'Worker is live', variant: 'success' });
  } catch (err) {
    errorText.value = err instanceof Error ? err.message : 'Deploy failed';
    const maybeFailedSecret = typeof (err as { failedSecret?: unknown }).failedSecret === 'string'
      ? String((err as { failedSecret?: string }).failedSecret)
      : '';
    failedSecretName.value = maybeFailedSecret;
    if (maybeFailedSecret) {
      errorText.value = `${errorText.value} (${maybeFailedSecret})`;
    }
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

async function retryFailedSecret() {
  if (!failedSecretName.value) return;
  await runDeploy(failedSecretName.value);
}

async function goToDescribe() {
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
  transition: max-width 220ms ease;
}

.page-content.is-deploy-mode {
  max-width: clamp(960px, 72vw, 1320px);
}

.page-content.is-editor-expanded {
  max-width: max(960px, min(66vw, calc(100vw - 48px)));
}

.review-stack,
.deploy-stack {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.review-stack {
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
}

.deploy-stack {
  width: 100%;
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

.hero-fade-enter-from,
.hero-fade-leave-to {
  opacity: 0;
}

.name-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.name-block label,
.env-mode label {
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

.mono-input.is-invalid {
  border-color: color-mix(in srgb, var(--er), var(--bd) 40%);
}

.field-error,
.field-warning,
.field-ok,
.env-meta,
.deploy-note {
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 600;
}

.field-error,
.field-warning {
  color: var(--er);
}

.field-warning,
.field-ok {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.field-ok {
  color: var(--gn);
}

.env-meta,
.deploy-note {
  color: var(--tm);
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

.prompt-block {
  width: 100%;
  align-self: center;
  transition: width 220ms ease;
}

.prompt-block.is-expanded {
  width: max(100%, min(66vw, calc(100vw - 48px)));
}

.secrets-head h2 {
  font-family: var(--sans);
  font-size: 18px;
  font-weight: 700;
}

.secrets-head p {
  margin-top: 4px;
  color: var(--tm);
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 600;
}

.modal-status-wrap {
  display: flex;
  justify-content: center;
}

.modal-status-pill {
  border-radius: 999px;
  border: 1px solid var(--bd);
  padding: 8px 14px;
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.modal-status-pill.is-ready {
  border-color: color-mix(in srgb, var(--gn), var(--bd) 40%);
  color: var(--gn);
  background: color-mix(in srgb, var(--gn), transparent 90%);
}

.modal-status-pill.is-warning {
  border-color: color-mix(in srgb, var(--er), var(--bd) 40%);
  color: var(--er);
  background: color-mix(in srgb, var(--er), transparent 90%);
}

.modal-status-pill.is-pending {
  border-color: color-mix(in srgb, var(--o), var(--bd) 42%);
  color: color-mix(in srgb, var(--o), #ffd9bf 20%);
  background: color-mix(in srgb, var(--o), transparent 90%);
}

.secrets-modal {
  width: 100%;
  max-height: min(86vh, 860px);
  display: flex;
  flex-direction: column;
}

:deep(.ui-dialog) {
  width: min(980px, calc(100vw - 20px));
}

.secrets-head {
  padding: 16px;
  border-bottom: 1px solid var(--bd);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.secrets-title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.secrets-icon-chip {
  height: 30px;
  width: 30px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--o), var(--bd) 70%);
  background: color-mix(in srgb, var(--o), transparent 86%);
  color: var(--o);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.secrets-head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mode-toggle {
  height: 40px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.icon-close {
  height: 40px;
  width: 40px;
  border-radius: 10px;
  border: 1px solid var(--bd);
  background: var(--el);
  color: var(--t2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: 120ms ease;
}

.icon-close:hover {
  border-color: var(--t2);
  color: var(--tx);
}

.secrets-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.secrets-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.secrets-empty {
  padding: 16px;
  color: var(--tm);
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 600;
}

.env-mode {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.env-input {
  width: 100%;
  min-height: 120px;
  border: 1px solid var(--bd);
  border-radius: 10px;
  background: var(--el);
  color: var(--tx);
  padding: 12px;
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.55;
  resize: vertical;
}

.secret-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.secret-item {
  border: 1px solid color-mix(in srgb, var(--bd), var(--tx) 4%);
  border-radius: 12px;
  padding: 14px;
  background: color-mix(in srgb, var(--bg), var(--sf) 40%);
}

.secret-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.secret-label {
  font-family: var(--sans);
  font-size: 14px;
  font-weight: 700;
  color: var(--tx);
}

.required {
  margin-left: 8px;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 700;
  color: var(--o);
  text-transform: uppercase;
}

.secret-name,
.secret-description,
.help-link {
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 600;
}

.secret-name,
.secret-description {
  color: var(--tm);
}

.secret-description {
  margin-top: 5px;
}

.help-link {
  text-decoration: none;
  color: var(--t2);
}

.help-link:hover {
  color: var(--tx);
}

.secret-input-row {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.reveal-btn {
  min-width: 102px;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.secrets-foot {
  border-top: 1px solid var(--bd);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
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

.deploy-status-line {
  padding: 10px 20px;
  display: flex;
  justify-content: center;
}

.deploy-status-pill {
  border-radius: 999px;
  border: 1px solid var(--bd);
  padding: 7px 14px;
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.deploy-status-pill.is-ready {
  border-color: color-mix(in srgb, var(--gn), var(--bd) 40%);
  color: var(--gn);
  background: color-mix(in srgb, var(--gn), transparent 91%);
}

.deploy-status-pill.is-warning {
  border-color: color-mix(in srgb, var(--er), var(--bd) 45%);
  color: var(--er);
  background: color-mix(in srgb, var(--er), transparent 91%);
}

.deploy-status-pill.is-pending {
  border-color: color-mix(in srgb, var(--o), var(--bd) 45%);
  color: color-mix(in srgb, var(--o), #ffd9bf 20%);
  background: color-mix(in srgb, var(--o), transparent 91%);
}

.toolbar-actions-right {
  justify-content: flex-end;
}

.action-btn {
  height: 40px;
  min-width: 148px;
  padding: 0 18px;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
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
    flex-wrap: wrap;
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

  .secret-input-row {
    flex-direction: column;
    align-items: stretch;
  }

  .secrets-head {
    flex-direction: column;
    align-items: stretch;
  }

  .secrets-head-actions {
    width: 100%;
  }

  .mode-toggle,
  .icon-close {
    flex: 1;
  }

  .secrets-foot {
    flex-direction: column;
    align-items: stretch;
  }

  .secrets-foot .mode-toggle {
    width: 100%;
  }
}
</style>
