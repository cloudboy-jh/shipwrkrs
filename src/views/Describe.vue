<template>
  <div class="page-center">
    <div class="page-content">
      <Transition name="hero-fade">
        <div v-if="showIntro" class="hero">
          <h1>Describe your <em>Worker</em></h1>
          <p>plain english → generated code → one-click deploy</p>
        </div>
      </Transition>

      <div class="prompt-block">
        <div class="prompt-inner">
          <textarea
            class="prompt-textarea"
            v-model="description"
            @input="handleDescriptionInput"
            placeholder="A proxy that adds CORS headers to any API..."
            maxlength="3000"
          />
        </div>
        <div class="toolbar">
          <div class="toolbar-left">
            <button class="model-pill" @click="toggleTier">
              <span class="model-dot"></span>
              {{ tier === 'free' ? 'qwen-coder-32b' : 'claude-sonnet' }}
            </button>
            <span class="meta-text">{{ tier === 'free' ? 'free' : 'premium' }}</span>
            <button class="icon-btn" title="Worker examples" aria-label="Worker examples" @click="openExamples">
              <ScrollText :size="14" />
            </button>
          </div>
          <button class="btn-primary" :disabled="loading" @click="runGenerate">
            <span>{{ loading ? 'Writing...' : 'Generate' }}</span>
            <SquareChevronRight :size="14" />
          </button>
        </div>
      </div>

      <p class="error-text" v-if="errorText">{{ errorText }}</p>
    </div>

    <div class="page-bottom-links">
      <img class="cf-mark" :src="cloudflareIconSrc" alt="" aria-hidden="true" />
      <div class="docs-links">
        <a class="doc-badge" href="https://developers.cloudflare.com/workers/" target="_blank" rel="noreferrer">
          Workers docs
        </a>
        <a
          class="doc-badge"
          href="https://developers.cloudflare.com/workers/runtime-apis/"
          target="_blank"
          rel="noreferrer"
        >
          Runtime APIs
        </a>
        <a
          class="doc-badge"
          href="https://developers.cloudflare.com/workers/platform/pricing/"
          target="_blank"
          rel="noreferrer"
        >
          Pricing + limits
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ScrollText, SquareChevronRight } from 'lucide-vue-next';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import { useFlowState, slugifyWorkerName } from '../composables/useFlowState';

const tier = ref<'free' | 'premium'>('free');
const errorText = ref('');
const router = useRouter();
const { description, generatedCode, scriptName } = useFlowState();
const loading = ref(false);
const { refresh, isAuthed } = useAuth();
const showIntro = ref(true);
const introTimerMs = 12_000;
let introTimer: ReturnType<typeof setTimeout> | null = null;
const currentTheme = ref<'light' | 'dark'>(
  document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark',
);
const cloudflareIconSrc = computed(() =>
  currentTheme.value === 'light'
    ? 'https://cdn.simpleicons.org/cloudflare/f25706'
    : 'https://cdn.simpleicons.org/cloudflare/ffffff',
);
let themeObserver: MutationObserver | null = null;

function hideIntro() {
  showIntro.value = false;
}

function startIntroTimer() {
  introTimer = setTimeout(() => {
    hideIntro();
  }, introTimerMs);
}

function handleDescriptionInput() {
  if (description.value.trim()) hideIntro();
}

function syncTheme() {
  currentTheme.value = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

function toggleTier() {
  tier.value = tier.value === 'free' ? 'premium' : 'free';
}

function openExamples() {
  router.push('/examples');
}

onMounted(async () => {
  await refresh();
  if (!isAuthed.value) await router.replace('/');

  if (description.value.trim()) {
    hideIntro();
  } else {
    startIntroTimer();
  }

  themeObserver = new MutationObserver(syncTheme);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
});

onBeforeUnmount(() => {
  if (introTimer) clearTimeout(introTimer);
  if (themeObserver) themeObserver.disconnect();
});

async function runGenerate() {
  if (!description.value.trim()) {
    errorText.value = 'Description is required';
    return;
  }
  errorText.value = '';
  generatedCode.value = '';
  scriptName.value = slugifyWorkerName(description.value);
  sessionStorage.setItem('shipwrkrs:tier', tier.value);
  await router.push('/processing');
}
</script>

<style scoped>

.page-content {
  width: 100%;
  max-width: 580px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.hero { text-align: center; }

.hero h1 {
  font-family: var(--sans);
  font-size: 36px;
  font-weight: 800;
  color: var(--tx);
  letter-spacing: -0.035em;
  line-height: 1.1;
}

.hero h1 em { font-style: normal; color: var(--o); }

.hero p {
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 500;
  color: var(--tm);
  margin-top: 10px;
}

.hero-fade-enter-active,
.hero-fade-leave-active {
  transition: opacity 260ms ease, transform 260ms ease, margin 260ms ease;
}

.hero-fade-enter-from,
.hero-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.prompt-inner { padding: 20px; }

.prompt-textarea {
  width: 100%;
  min-height: 120px;
  background: transparent;
  border: none;
  color: var(--tx);
  font-family: var(--mono);
  font-size: 14px;
  font-weight: 500;
  line-height: 1.7;
  resize: none;
  outline: none;
}

.prompt-textarea::placeholder { color: var(--tm); }

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.model-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--t2);
  background: var(--el);
  border: 1px solid var(--bd);
  border-radius: 8px;
  padding: 6px 12px;
  cursor: pointer;
  transition: 120ms ease;
}

.model-pill:hover {
  border-color: var(--o);
  color: var(--tx);
}

.model-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--gn);
}

.meta-text {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--tm);
}

.icon-btn {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  border: 1px solid var(--bd);
  background: var(--el);
  color: var(--o);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-primary:disabled {
  opacity: 0.5;
  pointer-events: none;
}

.docs-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.page-bottom-links {
  position: fixed;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
}

.cf-mark {
  width: 16px;
  height: 16px;
  opacity: 0.9;
}

@media (prefers-reduced-motion: reduce) {
  .hero-fade-enter-active,
  .hero-fade-leave-active {
    transition: none;
  }
}

.doc-badge {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--t2);
  background: var(--sf);
  border: 1px solid var(--bd);
  border-radius: 999px;
  padding: 7px 12px;
  text-decoration: none;
  transition: 120ms ease;
}

.doc-badge:hover {
  color: var(--tx);
  border-color: var(--o);
  background: var(--el);
}

.error-text {
  text-align: center;
  color: var(--er);
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 600;
}

@media (max-width: 600px) {
  .hero h1 { font-size: 28px; }
  .toolbar { flex-wrap: wrap; gap: 10px; }
  .page-bottom-links {
    width: calc(100vw - 24px);
    justify-content: center;
    flex-wrap: wrap;
    bottom: 12px;
  }
}
</style>
