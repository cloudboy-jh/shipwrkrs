<template>
  <section class="stack landing-wrap">
    <UiCard class="stack">
      <div class="logo-wrap">
        <img :src="logoSrc" alt="shipwrkrs logo" class="hero-logo" />
      </div>

      <h1 class="page-title">Deploy Cloudflare Workers in seconds.</h1>
      <p class="muted">Describe what you want. AI writes it. One click deploy.</p>

      <UiButton variant="primary" size="lg" @click="loginWithCloudflare">
        Sign in with Cloudflare
      </UiButton>
      <p class="tiny">Free • No API keys • Your account, your Workers</p>

      <UiSeparator />

      <UiButton variant="ghost" @click="enterMock">Run full mock mode</UiButton>

      <UiButton v-if="!oauthEnabled" variant="ghost" @click="tokenDialogOpen = true">
        OAuth unavailable? Set token once
      </UiButton>
    </UiCard>

    <UiDialog :open="tokenDialogOpen" @update:open="tokenDialogOpen = $event">
      <div class="stack">
        <h2 class="section-title">Token fallback</h2>
        <p class="muted">OAuth unavailable in this env. Set key once.</p>
        <UiInput v-model="accountId" placeholder="Cloudflare Account ID (optional)" />
        <UiTextarea
          v-model="apiToken"
          placeholder="Cloudflare API token with Workers Scripts:Edit + Account:Read"
        />
        <UiButton :disabled="saving" @click="saveToken">
          {{ saving ? 'Saving token...' : 'Set token once' }}
        </UiButton>
        <UiAlert variant="error" v-if="errorText">{{ errorText }}</UiAlert>
      </div>
    </UiDialog>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import logoSrc from '../shipwrkrs-logomain (1).png';
import { enableUiMockMode } from '../composables/api';
import { useAuth } from '../composables/useAuth';
import UiAlert from '../components/ui/Alert.vue';
import UiButton from '../components/ui/Button.vue';
import UiCard from '../components/ui/Card.vue';
import UiDialog from '../components/ui/Dialog.vue';
import UiInput from '../components/ui/Input.vue';
import UiSeparator from '../components/ui/Separator.vue';
import UiTextarea from '../components/ui/Textarea.vue';
import { useSonner } from '../components/ui/sonner';

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
.landing-wrap {
  width: 100%;
}

.logo-wrap {
  display: flex;
  justify-content: center;
}

.hero-logo {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  object-fit: cover;
}
</style>
