<template>
  <section class="stack">
    <UiCard class="stack">
      <h2 class="section-title success-text" style="margin: 0">Your Worker is live!</h2>

      <UiAlert variant="success">
        <a :href="url" target="_blank" rel="noreferrer">{{ url }}</a>
      </UiAlert>

      <div class="row wrap">
        <UiButton variant="primary" @click="copyUrl">Copy URL</UiButton>
        <UiButton as="a" variant="secondary" :href="url" target="_blank" rel="noreferrer">Open</UiButton>
        <UiButton variant="ghost" @click="deployAnother">Deploy another</UiButton>
      </div>

      <p class="tiny" v-if="copied">Copied.</p>
    </UiCard>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import UiAlert from '../components/ui/Alert.vue';
import UiButton from '../components/ui/Button.vue';
import UiCard from '../components/ui/Card.vue';
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
}

async function deployAnother() {
  await router.push('/describe');
}
</script>
