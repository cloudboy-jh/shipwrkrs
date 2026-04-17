<template>
  <div class="page-center">
    <div class="page-content">
      <div class="hero">
        <h1>Connect your <em>Cloudflare</em> account</h1>
      </div>

      <form class="token-form" @submit.prevent="connectToken">
        <label class="field-label" for="cf-token">Cloudflare API token</label>
        <input
          id="cf-token"
          v-model.trim="token"
          class="text-input"
          type="password"
          autocomplete="off"
          spellcheck="false"
          placeholder="Paste Cloudflare API token"
          required
        />

        <label class="field-label" for="cf-account">Cloudflare Account ID</label>
        <input
          id="cf-account"
          v-model.trim="accountId"
          class="text-input"
          type="text"
          autocomplete="off"
          spellcheck="false"
          placeholder="Paste account id"
          required
        />
        <button class="btn-primary full signin-btn" :disabled="loading || !tokenAuthEnabled">
          <img
            class="signin-icon"
            :src="cloudflareIconSrc"
            alt=""
            aria-hidden="true"
          />
          <span>{{ loading ? 'Connecting…' : 'Connect account' }}</span>
        </button>
      </form>

      <p class="meta-line">
        Need a token?
        <a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noreferrer">Create one in Cloudflare</a>
      </p>
      <p class="meta-line">Account ID: Cloudflare dashboard → Account Home → right sidebar.</p>
      <details class="scope-details">
        <summary>
          Required scopes
          <span class="chevron">▾</span>
        </summary>
        <ul>
          <li>Account → Account Settings → Read</li>
          <li>Account → Workers Scripts → Edit</li>
          <li>Account → Workers Scripts → Read (recommended)</li>
          <li>User → User Details → Read (optional, for email/profile)</li>
        </ul>
      </details>

      <div v-if="frontendOnly" class="dev-toggle-row">
        <button class="dev-toggle" type="button" @click="toggleFrontendMock">
          {{ uiMockEnabled ? 'Disable' : 'Enable' }} frontend UI mock mode
        </button>
      </div>

      <p class="error-text" v-if="errorText">{{ errorText }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { disableUiMockMode, enableUiMockMode, isUiMockMode } from '../composables/api';
import { useAuth } from '../composables/useAuth';

const errorText = ref('');
const token = ref('');
const accountId = ref('');
const loading = ref(false);
const tokenAuthEnabled = ref(true);
const router = useRouter();
const { refresh, isAuthed, saveApiToken } = useAuth();
const cloudflareIconSrc = 'https://cdn.simpleicons.org/cloudflare/ffffff';
const frontendOnly = import.meta.env.VITE_FRONTEND_ONLY === 'true';
const uiMockEnabled = ref(isUiMockMode());

onMounted(async () => {
  if (frontendOnly && !uiMockEnabled.value) {
    tokenAuthEnabled.value = false;
    errorText.value = 'Frontend-only mode: enable UI mock mode to test without backend APIs.';
    return;
  }

  const status = await refresh();
  tokenAuthEnabled.value = status.tokenAuthEnabled ?? true;
  if (!tokenAuthEnabled.value) {
    errorText.value = 'Token auth is unavailable. Missing SESSION_SECRET or AUTH_ENCRYPTION_KEY.';
  }
  if (isAuthed.value) await router.replace('/describe');
});

function toggleFrontendMock() {
  if (uiMockEnabled.value) {
    disableUiMockMode();
  } else {
    enableUiMockMode();
  }
  location.reload();
}

async function connectToken() {
  if (!tokenAuthEnabled.value) {
    errorText.value = 'Token auth is unavailable in this environment.';
    return;
  }
  if (!token.value) {
    errorText.value = 'Cloudflare API token is required.';
    return;
  }

  errorText.value = '';
  if (!accountId.value) {
    errorText.value = 'Cloudflare Account ID is required.';
    return;
  }
  if (!/^[a-f0-9]{32}$/i.test(accountId.value)) {
    errorText.value = 'Cloudflare Account ID must be a 32-character hex value.';
    return;
  }
  loading.value = true;

  try {
    await saveApiToken(token.value, accountId.value);
    token.value = '';
    accountId.value = '';
    await router.replace('/describe');
  } catch (err) {
    errorText.value = err instanceof Error ? err.message : 'Failed to connect token';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.page-content {
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.hero {
  text-align: center;
  margin-bottom: 4px;
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

.token-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.field-label {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--t2);
}

.field-label span {
  color: var(--tm);
}

.text-input {
  width: 100%;
  height: 42px;
  border-radius: 10px;
  border: 1px solid var(--bd);
  background: var(--sf);
  color: var(--tx);
  padding: 0 12px;
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 600;
}

.text-input:focus {
  outline: none;
  border-color: var(--o);
}


.full {
  width: 100%;
}

.btn-primary {
  margin-top: 6px;
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

.meta-line a {
  color: var(--t2);
}

.scope-details {
  margin: 0 auto;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 700;
  color: var(--t2);
}

.scope-details summary {
  list-style: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.scope-details summary::-webkit-details-marker {
  display: none;
}

.chevron {
  transition: transform 120ms ease;
}

.scope-details[open] .chevron {
  transform: rotate(180deg);
}

.scope-details ul {
  margin: 8px 0 0;
  padding-left: 16px;
  color: var(--tm);
  display: grid;
  gap: 4px;
}

.dev-toggle-row {
  display: flex;
  justify-content: center;
}

.dev-toggle {
  border: 1px dashed var(--bd);
  background: transparent;
  color: var(--t2);
  border-radius: 999px;
  padding: 7px 12px;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.dev-toggle:hover {
  color: var(--tx);
  border-color: var(--o);
}

.error-text {
  text-align: center;
  color: var(--er);
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 600;
}

@media (max-width: 600px) {
  .hero h1 {
    font-size: 28px;
  }
}
</style>
