<template>
  <div class="clone-section" :class="{ inline: props.inline }">
    <button
      v-if="!isExpanded"
      class="clone-toggle-btn"
      type="button"
      @click="isExpanded = true"
    >
      <GitFork :size="14" />
      <template v-if="!props.inline">Clone this Worker</template>
    </button>

    <Teleport v-if="isExpanded" to="body">
      <div class="clone-overlay" @click="isExpanded = false">
        <div class="clone-modal" @click.stop>
          <div class="clone-header">
            <p class="clone-title">Clone this Worker</p>
            <button class="clone-close" type="button" @click="isExpanded = false">
              <X :size="14" />
            </button>
          </div>
          <div class="clone-box">
            <code class="clone-command">{{ cloneCommand }}</code>
            <button
              class="copy-btn"
              :class="{ copied: copied }"
              type="button"
              @click="copyCloneUrl"
              :disabled="!cloneUrl"
            >
              <Check v-if="copied" :size="14" />
              <Copy v-else :size="14" />
              {{ copied ? 'Copied!' : 'Copy' }}
            </button>
          </div>
          <p class="clone-hint">Token expires in 1 hour</p>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { Check, Copy, GitFork, X } from 'lucide-vue-next';
import { computed, ref } from 'vue';

const props = defineProps<{
  scriptName: string;
  cloneUrl: string | null;
  inline?: boolean;
}>();

const isExpanded = ref(false);
const copied = ref(false);

const cloneCommand = computed(() => {
  if (!props.cloneUrl) return 'Generating clone URL...';
  return `git clone ${props.cloneUrl}`;
});

async function copyCloneUrl() {
  if (!props.cloneUrl) return;
  try {
    await navigator.clipboard.writeText(`git clone ${props.cloneUrl}`);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    // Ignore copy errors
  }
}
</script>

<style scoped>
.clone-section {
  margin-top: 16px;
}

.clone-section.inline {
  margin-top: 0;
  display: inline-flex;
}

.clone-toggle-btn {
  height: 32px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid color-mix(in srgb, var(--gn), var(--bd) 72%);
  border-radius: 8px;
  background: color-mix(in srgb, var(--gn), transparent 95%);
  color: var(--gn);
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 120ms ease;
}

.clone-toggle-btn:hover {
  background: color-mix(in srgb, var(--gn), transparent 90%);
  border-color: var(--gn);
}

.clone-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
}

.clone-modal {
  width: min(520px, 100%);
  padding: 20px;
  border: 1px solid color-mix(in srgb, var(--gn), var(--bd) 72%);
  border-radius: 12px;
  background: color-mix(in srgb, var(--gn), transparent 95%);
  backdrop-filter: blur(10px);
}

.clone-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.clone-title {
  font-family: var(--sans);
  font-size: 16px;
  font-weight: 700;
  color: var(--gn);
}

.clone-close {
  height: 32px;
  width: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--tm);
  cursor: pointer;
  transition: all 120ms ease;
}

.clone-close:hover {
  background: color-mix(in srgb, var(--gn), transparent 85%);
  color: var(--tx);
}

.clone-box {
  display: flex;
  gap: 10px;
  align-items: center;
}

.clone-command {
  flex: 1;
  min-width: 0;
  padding: 12px 14px;
  background: var(--sf);
  border: 1px solid var(--bd);
  border-radius: 10px;
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 500;
  color: var(--tx);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.copy-btn {
  height: 44px;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid var(--bd);
  border-radius: 10px;
  background: var(--el);
  color: var(--t2);
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 120ms ease;
  white-space: nowrap;
}

.copy-btn:hover:not(:disabled) {
  border-color: var(--o);
  color: var(--tx);
}

.copy-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.copy-btn.copied {
  border-color: var(--gn);
  color: var(--gn);
}

.clone-hint {
  margin-top: 12px;
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 500;
  color: var(--tm);
}
</style>
