<template>
  <div class="page-center">
    <div class="page-content">
      <div class="check-circle"><CheckCircle2 :size="24" /></div>

      <div class="hero">
        <h1>Worker is <em>live</em></h1>
      </div>

      <div class="url-block">
        <a :href="url" target="_blank" rel="noreferrer">{{ url }}</a>
      </div>

      <div class="actions-row">
        <button class="btn-primary" @click="copyUrl">Copy URL</button>
        <a class="btn-ghost" :href="url" target="_blank" rel="noreferrer">Open</a>
        <button class="btn-ghost" @click="deployAnother">Deploy another</button>
      </div>

      <p class="copied" v-if="copied">Copied.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CheckCircle2 } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSonner } from '../components/ui/sonner';
import { useFlowState } from '../composables/useFlowState';

const copied = ref(false);
const router = useRouter();
const { deployedUrl, scriptName } = useFlowState();
const url = computed(() => deployedUrl.value ?? `https://${scriptName.value}.workers.dev`);
const { pushToast } = useSonner();

async function copyUrl() {
  await navigator.clipboard.writeText(url.value);
  copied.value = true;
  pushToast({ title: 'URL copied', message: url.value, variant: 'success' });
  setTimeout(() => {
    copied.value = false;
  }, 1600);
}

async function deployAnother() {
  await router.push('/describe');
}
</script>

<style scoped>
.page-content {
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
}

.check-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 2px solid var(--gn);
  background: color-mix(in srgb, var(--gn), transparent 88%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--gn);
}

.hero {
  text-align: center;
}

.hero h1 {
  font-family: var(--sans);
  font-size: 36px;
  font-weight: 800;
  color: var(--gn);
  letter-spacing: -0.035em;
  line-height: 1.1;
}

.hero h1 em {
  font-style: normal;
  color: var(--gn);
}

.url-block {
  width: 100%;
  background: var(--sf);
  border: 1px solid color-mix(in srgb, var(--gn), var(--bd) 72%);
  border-radius: 16px;
  padding: 16px;
  position: relative;
}

.url-block::before {
  content: '';
  position: absolute;
  top: -1px;
  left: 20%;
  right: 20%;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--gn), transparent);
  opacity: 0.5;
}

.url-block a {
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 600;
  color: var(--tx);
  text-decoration: none;
  word-break: break-all;
}

.actions-row {
  width: 100%;
  display: flex;
  gap: 10px;
}

.btn-primary,
.btn-ghost {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
}



.copied {
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 600;
  color: var(--tm);
}

@media (max-width: 680px) {
  .hero h1 {
    font-size: 28px;
  }

  .actions-row {
    flex-direction: column;
  }
}
</style>
