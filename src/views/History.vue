<template>
  <section class="stack">
    <UiCard class="stack">
      <h2 class="section-title">Deploy history</h2>

      <UiAlert variant="error" v-if="errorText">{{ errorText }}</UiAlert>

      <div class="stack" v-if="loading">
        <UiSkeleton height="16px" width="40%" />
        <UiSkeleton height="80px" />
        <UiSkeleton height="80px" />
      </div>

      <UiScrollArea maxHeight="560px" v-else>
        <div class="stack">
          <UiCard v-for="item in history" :key="item.id" class="stack history-item-card">
            <div class="row wrap" style="justify-content: space-between">
              <strong>{{ item.scriptName }}</strong>
              <span class="tiny">{{ new Date(item.createdAt).toLocaleString() }}</span>
            </div>
            <a :href="item.url" target="_blank" rel="noreferrer">{{ item.url }}</a>
            <UiBadge :variant="item.status === 'live' ? 'success' : 'warning'">{{ item.status }}</UiBadge>
            <UiAccordion title="Show deployed code">
              <pre class="history-code">{{ item.code }}</pre>
            </UiAccordion>
          </UiCard>
        </div>
      </UiScrollArea>
    </UiCard>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../composables/api';
import UiAccordion from '../components/ui/Accordion.vue';
import UiAlert from '../components/ui/Alert.vue';
import UiBadge from '../components/ui/Badge.vue';
import UiCard from '../components/ui/Card.vue';
import UiScrollArea from '../components/ui/ScrollArea.vue';
import UiSkeleton from '../components/ui/Skeleton.vue';

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

onMounted(async () => {
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
.history-item-card {
  padding: 16px;
}

.history-code {
  background: var(--editor-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 12px;
  overflow: auto;
  font-family: var(--font-mono);
  font-size: 13px;
}
</style>
