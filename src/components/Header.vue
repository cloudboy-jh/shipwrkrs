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
        <div class="header-avatar" @click="handleLogout">
          {{ user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?' }}
        </div>
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
</template>

<script setup lang="ts">
import { Moon, Sun } from 'lucide-vue-next';
import { onMounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import logoSrc from '../shipwrkrs-logomain (1).png';
import { useAuth } from '../composables/useAuth';
import { useMeta } from '../composables/useMeta';
import UiDialog from './ui/Dialog.vue';

const { user, logout, refresh } = useAuth();
const { limits, refreshLimits } = useMeta();
const router = useRouter();
const statsOpen = ref(false);
const themeMode = ref<'light' | 'dark'>('dark');
const effectiveTheme = ref<'light' | 'dark'>('dark');

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

async function handleLogout() {
  await logout();
  statsOpen.value = false;
  await router.push('/');
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
}
</style>
