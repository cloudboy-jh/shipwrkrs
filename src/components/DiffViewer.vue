<template>
  <div class="diff-viewer">
    <div class="diff-toolbar">
      <div class="diff-toggle">
        <button
          :class="['toggle-btn', { active: viewMode === 'unified' }]"
          @click="setViewMode('unified')"
        >
          Unified
        </button>
        <button
          :class="['toggle-btn', { active: viewMode === 'split' }]"
          @click="setViewMode('split')"
        >
          Split
        </button>
      </div>
    </div>
    <div ref="diffContainer" class="diff-container"></div>
  </div>
</template>

<script setup lang="ts">
import { FileDiff } from '@pierre/diffs';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps<{
  oldCode: string;
  newCode: string;
  oldFilename?: string;
  newFilename?: string;
}>();

const diffContainer = ref<HTMLElement | null>(null);
const viewMode = ref<'unified' | 'split'>('unified');
let fileDiff: FileDiff | null = null;

function setViewMode(mode: 'unified' | 'split') {
  viewMode.value = mode;
  renderDiff();
}

function renderDiff() {
  if (!diffContainer.value) return;

  if (!fileDiff) {
    fileDiff = new FileDiff({
      disableFileHeader: true,
      lineNumbers: true,
      themeType: 'dark',
      diffStyle: viewMode.value,
    });
  }

  fileDiff.setOptions({
    disableFileHeader: true,
    lineNumbers: true,
    themeType: 'dark',
    diffStyle: viewMode.value,
  });

  fileDiff.render({
    oldFile: {
      content: props.oldCode,
      fileName: props.oldFilename || 'worker.js',
    },
    newFile: {
      content: props.newCode,
      fileName: props.newFilename || 'worker.js',
    },
    fileContainer: diffContainer.value,
  });
}

onMounted(() => {
  renderDiff();
});

watch(
  () => [props.oldCode, props.newCode],
  () => {
    renderDiff();
  },
  { deep: true }
);

onBeforeUnmount(() => {
  if (fileDiff) {
    fileDiff.cleanUp();
    fileDiff = null;
  }
});
</script>

<style scoped>
.diff-viewer {
  border: 1px solid var(--bd);
  border-radius: 12px;
  overflow: hidden;
  background: var(--sf);
}

.diff-toolbar {
  display: flex;
  justify-content: flex-end;
  padding: 8px 12px;
  border-bottom: 1px solid var(--bd);
  background: color-mix(in srgb, var(--bg), var(--sf) 38%);
}

.diff-toggle {
  display: flex;
  gap: 4px;
  padding: 3px;
  border: 1px solid var(--bd);
  border-radius: 8px;
  background: var(--el);
}

.toggle-btn {
  padding: 4px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--t2);
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 120ms ease;
}

.toggle-btn:hover {
  color: var(--tx);
}

.toggle-btn.active {
  background: var(--o);
  color: #000;
}

.diff-container {
  min-height: 200px;
  max-height: 60vh;
  overflow: auto;
}

.diff-container :deep(pre) {
  margin: 0;
}
</style>
