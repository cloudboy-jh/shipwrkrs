<template>
  <div class="page-center">
    <div class="page-content">
      <div class="hero">
        <h1>Deploy <em>Workers</em> in seconds</h1>
      </div>

      <button class="btn-primary full signin-btn" @click="loginWithCloudflare">
        <img
          class="signin-icon"
          src="https://cdn.simpleicons.org/cloudflare/ffffff"
          alt=""
          aria-hidden="true"
        />
        <span>Sign in with Cloudflare</span>
      </button>
      <p class="meta-line">Free · No API keys · Your account</p>

      <button class="btn-ghost full" @click="enterMock">Run full mock mode</button>

      <button v-if="!oauthEnabled" class="btn-ghost full" @click="tokenDialogOpen = true">
        OAuth unavailable? Set token once
      </button>

      <p class="error-text" v-if="errorText && !tokenDialogOpen">{{ errorText }}</p>
    </div>
  </div>

  <UiDialog :open="tokenDialogOpen" @update:open="tokenDialogOpen = $event">
    <div class="prompt-block dialog-block">
      <div class="prompt-inner">
        <div class="dialog-head">
          <h2>Token fallback</h2>
          <p>OAuth unavailable in this env. Set key once.</p>
        </div>
        <div class="field-stack">
          <input v-model="accountId" class="mono-input" placeholder="Cloudflare Account ID (optional)" />
          <textarea
            v-model="apiToken"
            class="prompt-textarea"
            placeholder="Cloudflare API token with Workers Scripts:Edit + Account:Read"
          />
        </div>
        <p class="error-text left" v-if="errorText">{{ errorText }}</p>
      </div>
      <div class="toolbar">
        <button class="btn-ghost" @click="tokenDialogOpen = false">Cancel</button>
        <button class="btn-primary" :disabled="saving" @click="saveToken">
          {{ saving ? 'Saving token...' : 'Set token once' }}
        </button>
      </div>
    </div>
  </UiDialog>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import UiDialog from '../components/ui/Dialog.vue';
import { useSonner } from '../components/ui/sonner';
import { enableUiMockMode } from '../composables/api';
import { useAuth } from '../composables/useAuth';

const apiToken = ref('');
const accountId = ref('');
const saving = ref(false);
const errorText = ref('');
const oauthEnabled = ref(true);
const tokenDialogOpen = ref(false);
const router = useRouter();
const { refresh, saveApiToken, isAuthed } = useAuth();
const { pushToast } = useSonner();

onMounted(async () => {
  const status = await refresh();
  oauthEnabled.value = status.oauthEnabled;
  if (isAuthed.value) await router.replace('/describe');
});

function loginWithCloudflare() {
  window.location.href = '/api/auth/login';
}

async function saveToken() {
  if (!apiToken.value.trim()) {
    errorText.value = 'Token is required';
    return;
  }
  saving.value = true;
  errorText.value = '';
  try {
    await saveApiToken(apiToken.value.trim(), accountId.value.trim() || undefined);
    tokenDialogOpen.value = false;
    pushToast({ title: 'Token saved', message: 'Fallback auth is ready', variant: 'success' });
    await router.push('/describe');
  } catch (err) {
    errorText.value = err instanceof Error ? err.message : 'Failed to save token';
  } finally {
    saving.value = false;
  }
}

async function enterMock() {
  enableUiMockMode();
  await refresh();
  pushToast({ title: 'Mock mode active', message: 'All UI flows are local now', variant: 'warning' });
  await router.push('/describe');
}
</script>

<style scoped>

.page-content {
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.hero {
  text-align: center;
  margin-bottom: 8px;
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

.full {
  width: 100%;
}

.btn-primary {
  height: 44px;
  padding: 0 28px;
  background: var(--o);
  color: var(--color-primary-foreground, #000);
  border: none;
  border-radius: 10px;
  font-family: var(--sans);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: 160ms ease;
  box-shadow: 0 0 0 1px var(--og), 0 4px 16px var(--og);
}

.btn-primary:hover {
  background: var(--od);
  transform: translateY(-1px);
  box-shadow: 0 0 0 1px var(--og), 0 8px 24px var(--og);
}

.btn-primary:disabled {
  opacity: 0.5;
  pointer-events: none;
}

.signin-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.signin-icon {
  width: 16px;
  height: 16px;
  border-radius: 4px;
}


.meta-line {
  text-align: center;
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 600;
  color: var(--tm);
}

.dialog-block {
  border: none;
  border-radius: 0;
}

.prompt-inner {
  padding: 20px;
}

.dialog-head {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.dialog-head h2 {
  font-family: var(--sans);
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.dialog-head p {
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 500;
  color: var(--tm);
}

.field-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mono-input {
  width: 100%;
  height: 40px;
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

.prompt-textarea {
  width: 100%;
  min-height: 120px;
  background: var(--el);
  border: 1px solid var(--bd);
  border-radius: 10px;
  color: var(--tx);
  padding: 12px;
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.6;
  resize: vertical;
  outline: none;
}

.mono-input::placeholder,
.prompt-textarea::placeholder {
  color: var(--tm);
}



.error-text {
  text-align: center;
  color: var(--er);
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 600;
}

.error-text.left {
  text-align: left;
}

@media (max-width: 600px) {
  .hero h1 {
    font-size: 28px;
  }

  .toolbar {
    gap: 10px;
    flex-wrap: wrap;
  }
}
</style>
