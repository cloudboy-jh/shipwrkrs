<template>
  <header class="topbar">
    <div class="topbar-inner">
      <RouterLink to="/" class="brand-link">
        <img :src="logoSrc" alt="shipwrkrs logo" class="brand-logo" />
        <span class="wordmark">shipwrkrs.dev</span>
      </RouterLink>

      <div class="right-area" v-if="user">
        <p class="signed-in desktop-only">Signed in as {{ user.email || user.name || 'user' }}</p>

        <UiButton size="sm" variant="secondary" @click="statsOpen = true">Stats</UiButton>

        <UiDropdownMenu :label="user.name || 'Account'">
          <div class="menu-stack">
            <p class="tiny">{{ user.email || 'Authenticated user' }}</p>
            <p class="tiny" style="margin-top: -6px">Auth: {{ user.authMode === 'oauth' ? 'OAuth' : 'Token' }}</p>
            <p class="tiny" style="margin-top: -6px">Mode: {{ isMock ? 'Mock' : 'Live' }}</p>
            <UiSeparator />
            <a class="menu-link" href="/history">Deploy history</a>
            <button class="menu-link danger" type="button" @click="handleLogout">Log out</button>
          </div>
        </UiDropdownMenu>

        <UiButton class="mobile-only" size="sm" variant="ghost" @click="sheetOpen = true">☰</UiButton>
      </div>

      <UiDialog :open="statsOpen" @update:open="statsOpen = $event">
        <div class="stack">
          <h3 style="margin: 0">Usage stats</h3>
          <p class="tiny" style="margin: 0">Resets daily at 00:00 UTC</p>
          <UiSeparator />
          <div class="stats-grid" v-if="limits">
            <div class="stat-item">
              <span class="tiny">Fast left</span>
              <strong>{{ limits.generationsFreeRemaining }}</strong>
            </div>
            <div class="stat-item">
              <span class="tiny">Premium left</span>
              <strong>{{ limits.generationsPremiumRemaining }}</strong>
            </div>
            <div class="stat-item">
              <span class="tiny">Deploy left</span>
              <strong>{{ limits.deploysRemaining }}</strong>
            </div>
          </div>
          <UiButton variant="primary" @click="statsOpen = false">Close</UiButton>
        </div>
      </UiDialog>

      <UiSheet :open="sheetOpen" @update:open="sheetOpen = $event">
        <div class="stack">
          <p class="muted" style="margin: 0">Menu</p>
          <UiSeparator />
          <a class="menu-link" href="/history">History</a>
          <button class="menu-link" type="button" @click="statsOpen = true">Stats</button>
          <button class="menu-link danger" type="button" @click="handleLogout">Log out</button>
        </div>
      </UiSheet>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import logoSrc from '../shipwrkrs-logomain (1).png';
import { isUiMockMode } from '../composables/api';
import { useAuth } from '../composables/useAuth';
import { useMeta } from '../composables/useMeta';
import UiButton from './ui/Button.vue';
import UiDialog from './ui/Dialog.vue';
import UiDropdownMenu from './ui/DropdownMenu.vue';
import UiSeparator from './ui/Separator.vue';
import UiSheet from './ui/Sheet.vue';

const { user, logout, refresh } = useAuth();
const { limits, refreshLimits } = useMeta();
const router = useRouter();
const sheetOpen = ref(false);
const statsOpen = ref(false);

const isMock = computed(() => isUiMockMode());

onMounted(async () => {
  await refresh();
  if (user.value) await refreshLimits();
});

async function handleLogout() {
  await logout();
  sheetOpen.value = false;
  statsOpen.value = false;
  await router.push('/');
}
</script>

<style scoped>
.topbar {
  border-bottom: 1px solid var(--border);
  background: rgba(9, 10, 11, 0.9);
  backdrop-filter: blur(6px);
  position: sticky;
  top: 0;
  z-index: 30;
}

.topbar-inner {
  max-width: 1280px;
  margin: 0 auto;
  min-height: 56px;
  padding: 8px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.brand-link {
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.brand-logo {
  width: 20px;
  height: 20px;
  border-radius: 5px;
  object-fit: cover;
}

.wordmark {
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.right-area {
  display: flex;
  align-items: center;
  gap: 8px;
}

.signed-in {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
}

.menu-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.menu-link {
  border: 1px solid var(--border);
  background: #0d1115;
  color: var(--text-secondary);
  border-radius: 8px;
  padding: 8px 10px;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
}

.menu-link:hover {
  color: var(--text-primary);
}

.menu-link.danger {
  color: var(--error);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.stat-item {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #0f1317;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mobile-only {
  display: none;
}

@media (max-width: 760px) {
  .desktop-only {
    display: none;
  }

  .mobile-only {
    display: inline-flex;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
