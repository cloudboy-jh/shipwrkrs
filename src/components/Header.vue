<template>
  <header class="topbar">
    <RouterLink to="/" class="brand">
      <div class="brand-mark">
        <img :src="logoSrc" alt="shipwrkrs" class="brand-img" />
      </div>
      <span class="brand-text">ship<span>wrkrs</span></span>
    </RouterLink>

    <div class="header-right">
      <template v-if="user">
        <RouterLink to="/history" class="header-link">History</RouterLink>
        <button class="header-link" @click="statsOpen = true">Stats</button>
        <button class="header-avatar" type="button" @click="accountOpen = true">
          {{ user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?' }}
        </button>
      </template>

      <button
        class="theme-toggle"
        type="button"
        :aria-label="effectiveTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
        :title="effectiveTheme === 'dark' ? 'Switch to light' : 'Switch to dark'"
        @click="toggleTheme"
      >
        <Sun v-if="effectiveTheme === 'dark'" :size="15" class="theme-icon" />
        <Moon v-else :size="15" class="theme-icon" />
      </button>
    </div>
  </header>

  <UiDialog :open="statsOpen" @update:open="statsOpen = $event">
    <div class="dialog-body">
      <div class="dialog-head">
        <h3>Usage stats</h3>
        <button class="header-link" @click="statsOpen = false">Close</button>
      </div>
      <p class="dialog-sub">Resets daily at 00:00 UTC</p>
      <div class="stats-grid" v-if="limits">
        <div class="stat-item">
          <span>Fast left</span>
          <strong>{{ limits.generationsFreeRemaining }}</strong>
        </div>
        <div class="stat-item">
          <span>Premium left</span>
          <strong>{{ limits.generationsPremiumRemaining }}</strong>
        </div>
        <div class="stat-item">
          <span>Deploy left</span>
          <strong>{{ limits.deploysRemaining }}</strong>
        </div>
      </div>
    </div>
  </UiDialog>

  <UiDialog :open="accountOpen" @update:open="accountOpen = $event">
    <div class="dialog-body account-dialog">
      <div class="dialog-head">
        <div>
          <h3>Account</h3>
          <p class="dialog-sub">{{ authConnectionLabel }}</p>
        </div>
        <button class="icon-close" type="button" aria-label="Close account modal" @click="accountOpen = false">
          <X :size="16" />
        </button>
      </div>

      <div class="identity-row">
        <div class="identity-avatar">{{ userInitials }}</div>
        <div class="identity-meta">
          <strong class="account-name">{{ user?.name || 'Connected account' }}</strong>
          <p class="account-value">{{ user?.email || 'Email unavailable for this token' }}</p>
        </div>
        <span class="account-badge">Cloudflare</span>
      </div>

      <div class="account-block">
        <p class="account-label">Account ID</p>
        <div class="account-id-row">
          <p class="account-id" :title="user?.accountId || ''">{{ user?.accountId || 'Unavailable' }}</p>
          <button class="btn-ghost copy-btn" type="button" :disabled="!user?.accountId" @click="copyAccountId">
            <Check v-if="copiedAccountId" :size="14" />
            <Copy v-else :size="14" />
            {{ copiedAccountId ? 'Copied' : 'Copy' }}
          </button>
        </div>
      </div>

      <div class="account-actions">
        <a class="btn-ghost account-link account-action" :href="dashboardUrl" target="_blank" rel="noreferrer">
          <ExternalLink :size="14" />
          Open dashboard
        </a>
      </div>

      <button class="btn-primary account-signout" type="button" @click="handleLogout">Sign out</button>
    </div>
  </UiDialog>
</template>

<script setup lang="ts">
import { Check, Copy, ExternalLink, Moon, Sun, X } from 'lucide-vue-next';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import logoSrc from '../shipwrkrs-logomain (1).png';
import { useAuth } from '../composables/useAuth';
import { useMeta } from '../composables/useMeta';
import UiDialog from './ui/Dialog.vue';

const { user, logout, refresh } = useAuth();
const { limits, refreshLimits } = useMeta();
const router = useRouter();
const statsOpen = ref(false);
const accountOpen = ref(false);
const copiedAccountId = ref(false);
const themeMode = ref<'light' | 'dark'>('dark');
const effectiveTheme = ref<'light' | 'dark'>('dark');
let copyResetTimer: ReturnType<typeof setTimeout> | null = null;
const dashboardUrl = computed(() =>
  user.value?.accountId ? `https://dash.cloudflare.com/${user.value.accountId}` : 'https://dash.cloudflare.com',
);
const userInitials = computed(() => {
  const fullName = user.value?.name?.trim();
  if (fullName) {
    const parts = fullName.split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
  }
  const fallback = user.value?.email?.charAt(0)?.toUpperCase();
  return fallback || '?';
});

const authConnectionLabel = computed(() =>
  user.value?.authMode === 'api_token' ? 'Connected via Cloudflare API token' : 'Signed in with Cloudflare',
);

function applyTheme(mode: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', mode);
  effectiveTheme.value = mode;
}

function setTheme(mode: 'light' | 'dark') {
  themeMode.value = mode;
  localStorage.setItem('shipwrkrs:theme', mode);
  applyTheme(mode);
}

function toggleTheme() {
  setTheme(effectiveTheme.value === 'dark' ? 'light' : 'dark');
}

onMounted(async () => {
  const saved = localStorage.getItem('shipwrkrs:theme');
  if (saved === 'light' || saved === 'dark') {
    themeMode.value = saved;
    applyTheme(saved);
  } else {
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(systemDark ? 'dark' : 'light');
  }

  await refresh();
  if (user.value) await refreshLimits();
});

onBeforeUnmount(() => {
  if (copyResetTimer) clearTimeout(copyResetTimer);
});

async function handleLogout() {
  await logout();
  accountOpen.value = false;
  statsOpen.value = false;
  await router.push('/');
}

async function copyAccountId() {
  if (!user.value?.accountId) return;
  await navigator.clipboard.writeText(user.value.accountId).catch(() => null);
  copiedAccountId.value = true;
  if (copyResetTimer) clearTimeout(copyResetTimer);
  copyResetTimer = setTimeout(() => {
    copiedAccountId.value = false;
  }, 1400);
}
</script>

<style scoped>
.topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 20;
  height: var(--topbar-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 34px;
  background: color-mix(in srgb, var(--bg), transparent 15%);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid color-mix(in srgb, var(--tx), transparent 94%);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}

.brand-mark {
  width: 34px;
  height: 34px;
  background: var(--o);
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.brand-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.brand-text {
  font-family: var(--mono);
  font-weight: 700;
  font-size: 18px;
  color: var(--tx);
  letter-spacing: -0.03em;
}

.brand-text span {
  color: var(--o);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 19px;
}

.theme-toggle {
  height: 36px;
  width: 36px;
  border-radius: 10px;
  border: 1px solid var(--bd);
  background: var(--el);
  color: var(--t2);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: 120ms ease;
}

.theme-icon {
  color: var(--o);
}

.theme-toggle:hover {
  border-color: var(--t2);
  transform: translateY(-1px);
}

.header-link {
  font-family: var(--mono);
  font-size: 14px;
  font-weight: 600;
  color: var(--t2);
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 120ms;
}

.header-link:hover {
  color: var(--tx);
}

.header-avatar {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--el);
  border: 1px solid var(--bd);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 700;
  color: var(--o);
  cursor: pointer;
  padding: 0;
}

.icon-close {
  height: 32px;
  width: 32px;
  border-radius: 8px;
  border: 1px solid var(--bd);
  background: var(--el);
  color: var(--t2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: 140ms ease;
}

.icon-close:hover {
  color: var(--tx);
  border-color: color-mix(in srgb, var(--tx), transparent 75%);
}

.account-dialog {
  width: min(560px, calc(100vw - 28px));
  margin-inline: auto;
  gap: 12px;
}

.identity-row {
  background: var(--el);
  border: 1px solid var(--bd);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.identity-avatar {
  height: 40px;
  width: 40px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--o), transparent 86%);
  border: 1px solid color-mix(in srgb, var(--o), transparent 72%);
  color: var(--o);
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.identity-meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.account-block {
  background: var(--el);
  border: 1px solid var(--bd);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.account-label {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--t2);
}

.account-name {
  font-family: var(--sans);
  font-size: 18px;
  font-weight: 800;
  color: var(--tx);
  line-height: 1.2;
}

.account-value,
.account-id {
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 600;
  color: var(--tx);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.account-id-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.account-id {
  flex: 1;
  min-width: 0;
  padding: 9px 10px;
  background: color-mix(in srgb, var(--bg), var(--el) 20%);
  border: 1px solid var(--bd);
  border-radius: 8px;
}

.copy-btn {
  height: 34px;
  padding: 0 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
}

.account-badge {
  width: fit-content;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 700;
  color: #000;
  background: var(--o);
  border-radius: 999px;
  padding: 3px 8px;
}

.account-actions {
  display: flex;
  gap: 8px;
}

.account-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  text-decoration: none;
}

.account-action {
  flex: 1;
}

.account-signout {
  margin-top: 2px;
  width: 100%;
}

.dialog-body {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.dialog-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dialog-head h3 {
  font-family: var(--sans);
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.dialog-sub {
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 500;
  color: var(--tm);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.stat-item {
  background: var(--el);
  border: 1px solid var(--bd);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat-item span {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--t2);
}

.stat-item strong {
  font-family: var(--sans);
  font-size: 20px;
  font-weight: 800;
  color: var(--tx);
}

@media (max-width: 620px) {
  .topbar {
    padding: 0 20px;
  }

  .header-link {
    display: none;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .account-id-row,
  .account-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .copy-btn,
  .account-action {
    width: 100%;
  }
}
</style>
