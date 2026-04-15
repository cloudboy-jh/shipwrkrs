<template>
  <div class="page-center">
    <div class="page-content">
      <div class="hero">
        <h1>Deploy <em>Workers</em> in seconds</h1>
      </div>

      <button class="btn-primary full signin-btn" @click="loginWithCloudflare">
        <img
          class="signin-icon"
          :src="cloudflareIconSrc"
          alt=""
          aria-hidden="true"
        />
        <span>Sign in with Cloudflare</span>
      </button>
      <p class="meta-line">Free · No API keys · Your account</p>

      <p class="error-text" v-if="errorText">{{ errorText }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';

const errorText = ref('');
const oauthEnabled = ref(true);
const router = useRouter();
const { refresh, isAuthed } = useAuth();
const cloudflareIconSrc = 'https://cdn.simpleicons.org/cloudflare/ffffff';

onMounted(async () => {
  const status = await refresh();
  oauthEnabled.value = status.oauthEnabled;
  if (!oauthEnabled.value) errorText.value = 'Cloudflare sign-in is unavailable for this environment.';
  if (isAuthed.value) await router.replace('/describe');
});

function loginWithCloudflare() {
  if (!oauthEnabled.value) return;
  window.location.href = '/api/auth/login';
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
