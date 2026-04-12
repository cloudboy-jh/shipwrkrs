<template>
  <div class="page-top">
    <div class="page-content">
      <div class="hero">
        <h1>Deploy <em>history</em></h1>
      </div>

      <p class="error-text" v-if="errorText">{{ errorText }}</p>

      <p class="loading" v-if="loading">Loading deploy history...</p>

      <div class="history-list" v-else>
        <article class="prompt-block" v-for="item in history" :key="item.id">
          <div class="prompt-inner">
            <div class="head-row">
              <strong>{{ item.scriptName }}</strong>
              <span>{{ new Date(item.createdAt).toLocaleString() }}</span>
            </div>

            <a :href="item.url" target="_blank" rel="noreferrer" class="deploy-link">{{ item.url }}</a>

            <details class="code-toggle">
              <summary>Show deployed code</summary>
              <pre class="history-code">{{ item.code }}</pre>
            </details>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../composables/api';
import { useAuth } from '../composables/useAuth';

type HistoryItem = {
  id: number;
  scriptName: string;
  url: string;
  status: 'live' | 'deleted';
  code: string;
  createdAt: string;
};

const history = ref<HistoryItem[]>([]);
const loading = ref(true);
const errorText = ref('');
const router = useRouter();
const { refresh, isAuthed } = useAuth();

onMounted(async () => {
  await refresh();
  if (!isAuthed.value) {
    await router.replace('/');
    return;
  }
  try {
    const res = await api<{ items: HistoryItem[] }>('/api/history');
    history.value = res.items;
  } catch (err) {
    errorText.value = err instanceof Error ? err.message : 'Failed to load history';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.page-content {
  width: 100%;
  max-width: 720px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.hero {
  text-align: center;
  margin-bottom: 6px;
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

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.prompt-inner {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.head-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.head-row strong {
  font-family: var(--mono);
  font-size: 14px;
  font-weight: 700;
  color: var(--tx);
}

.head-row span {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--tm);
}

.deploy-link {
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 600;
  color: var(--t2);
  text-decoration: none;
  word-break: break-all;
}

.deploy-link:hover {
  color: var(--tx);
}

.code-toggle summary {
  list-style: none;
  cursor: pointer;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--t2);
}

.code-toggle summary::-webkit-details-marker {
  display: none;
}

.history-code {
  margin-top: 10px;
  background: var(--el);
  border: 1px solid var(--bd);
  border-radius: 10px;
  padding: 12px;
  overflow: auto;
  color: var(--tx);
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.5;
}

.loading {
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 600;
  color: var(--tm);
}

.error-text {
  color: var(--er);
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 600;
}

@media (max-width: 720px) {
  .hero h1 {
    font-size: 28px;
  }

  .head-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
