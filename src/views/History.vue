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

            <p v-if="item.secretNames.length > 0" class="secret-line">
              Secrets: {{ item.secretNames.join(', ') }}
            </p>

            <div class="actions-row">
              <button
                v-if="item.hasArtifact"
                class="btn-ghost view-code-btn"
                type="button"
                @click="openCodeViewer(item)"
              >
                <FileCode :size="14" />
                View code
              </button>
              <details class="code-toggle" v-else>
                <summary>Show deployed code</summary>
                <pre class="history-code">{{ item.code }}</pre>
              </details>
            </div>
          </div>
        </article>
      </div>
    </div>

    <UiDialog :open="codeViewerOpen" @update:open="codeViewerOpen = $event">
      <div class="code-viewer-modal">
        <div class="code-viewer-head">
          <div class="code-viewer-title">
            <span class="code-viewer-icon"><FileCode :size="16" /></span>
            <div>
              <h3>{{ selectedItem?.scriptName }}</h3>
              <p>{{ selectedItem ? new Date(selectedItem.createdAt).toLocaleString() : '' }}</p>
            </div>
          </div>
          <button class="icon-close" type="button" aria-label="Close" @click="codeViewerOpen = false">
            <X :size="16" />
          </button>
        </div>
        <div class="code-viewer-body">
          <div v-if="codeLoading" class="code-loading">Loading code...</div>
          <div v-else-if="codeError" class="code-error">{{ codeError }}</div>
          <CodeEditor v-else :model-value="viewedCode" :read-only="true" />
        </div>
      </div>
    </UiDialog>
  </div>
</template>

<script setup lang="ts">
import { FileCode, X } from 'lucide-vue-next';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import CodeEditor from '../components/CodeEditor.vue';
import UiDialog from '../components/ui/Dialog.vue';
import { api } from '../composables/api';
import { useAuth } from '../composables/useAuth';

type HistoryItem = {
  id: number;
  scriptName: string;
  url: string;
  status: 'live' | 'deleted';
  code: string;
  secretNames: string[];
  createdAt: string;
  hasArtifact: boolean;
};

const history = ref<HistoryItem[]>([]);
const loading = ref(true);
const errorText = ref('');
const codeViewerOpen = ref(false);
const selectedItem = ref<HistoryItem | null>(null);
const viewedCode = ref('');
const codeLoading = ref(false);
const codeError = ref('');
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

async function openCodeViewer(item: HistoryItem) {
  selectedItem.value = item;
  codeViewerOpen.value = true;
  codeLoading.value = true;
  codeError.value = '';
  viewedCode.value = '';

  try {
    const res = await api<{ code: string; commitSha: string }>(
      `/api/artifacts/code?deployId=${item.id}`
    );
    viewedCode.value = res.code;
  } catch (err) {
    codeError.value = err instanceof Error ? err.message : 'Failed to load code';
  } finally {
    codeLoading.value = false;
  }
}
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

.secret-line {
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 600;
  color: var(--tm);
}

.actions-row {
  display: flex;
  gap: 10px;
}

.view-code-btn {
  height: 36px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.code-viewer-modal {
  width: min(900px, calc(100vw - 20px));
  max-height: min(86vh, 700px);
  display: flex;
  flex-direction: column;
}

.code-viewer-head {
  padding: 16px;
  border-bottom: 1px solid var(--bd);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.code-viewer-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.code-viewer-icon {
  height: 30px;
  width: 30px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--o), var(--bd) 70%);
  background: color-mix(in srgb, var(--o), transparent 86%);
  color: var(--o);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.code-viewer-title h3 {
  font-family: var(--sans);
  font-size: 16px;
  font-weight: 700;
  color: var(--tx);
}

.code-viewer-title p {
  margin-top: 2px;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--tm);
}

.icon-close {
  height: 40px;
  width: 40px;
  border-radius: 10px;
  border: 1px solid var(--bd);
  background: var(--el);
  color: var(--t2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: 120ms ease;
}

.icon-close:hover {
  border-color: var(--t2);
  color: var(--tx);
}

.code-viewer-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 16px;
}

.code-loading,
.code-error {
  padding: 40px;
  text-align: center;
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 500;
}

.code-loading {
  color: var(--tm);
}

.code-error {
  color: var(--er);
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
