<template>
  <section class="stack">
    <UiCard class="stack">
      <h2 class="section-title">Describe your Worker</h2>
      <p class="muted">Use plain English. You can edit the code before deploy.</p>

      <div class="stack" style="gap: 8px">
        <span class="tiny">Model</span>
        <select v-model="tier" class="ui-input">
          <option value="free">Fast (free)</option>
          <option value="premium">Premium</option>
        </select>
      </div>

      <UiTextarea v-model="description" placeholder="Describe your Worker..." maxlength="3000" />

      <UiProgress :value="loading ? 72 : 0" v-if="loading" />

      <UiButton variant="primary" size="lg" class="generate-cta" :disabled="loading" @click="runGenerate">
        {{ loading ? 'Writing your Worker...' : 'Generate Worker' }}
      </UiButton>

      <UiAlert variant="error" v-if="errorText">{{ errorText }}</UiAlert>
    </UiCard>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import UiAlert from '../components/ui/Alert.vue';
import UiButton from '../components/ui/Button.vue';
import UiCard from '../components/ui/Card.vue';
import UiProgress from '../components/ui/Progress.vue';
import UiTextarea from '../components/ui/Textarea.vue';
import { useSonner } from '../components/ui/sonner';
import { useAuth } from '../composables/useAuth';
import { useFlowState, slugifyWorkerName } from '../composables/useFlowState';
import { useGenerate } from '../composables/useGenerate';

const tier = ref<'free' | 'premium'>('free');
const errorText = ref('');
const router = useRouter();
const { description, generatedCode, scriptName } = useFlowState();
const { loading, generate } = useGenerate();
const { refresh, isAuthed } = useAuth();
const { pushToast } = useSonner();

onMounted(async () => {
  await refresh();
  if (!isAuthed.value) await router.replace('/');
});

async function runGenerate() {
  if (!description.value.trim()) {
    errorText.value = 'Description is required';
    return;
  }
  errorText.value = '';
  try {
    const res = await generate(description.value.trim(), tier.value);
    generatedCode.value = res.code;
    scriptName.value = slugifyWorkerName(description.value);
    pushToast({ title: 'Worker generated', message: `Model: ${res.model}`, variant: 'success' });
    await router.push('/review');
  } catch (err) {
    errorText.value = err instanceof Error ? err.message : 'Generation failed';
  }
}
</script>

<style scoped>
.generate-cta {
  height: 48px;
  font-size: 16px;
  font-weight: 700;
}
</style>
