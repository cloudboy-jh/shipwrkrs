<template>
  <div class="example-wrap">
    <UiButton
      v-for="prompt in prompts"
      :key="prompt"
      variant="ghost"
      size="sm"
      class="chip"
      @click="$emit('select', prompt)"
    >
      {{ prompt }}
    </UiButton>
  </div>
</template>

<script setup lang="ts">
import UiButton from './ui/Button.vue';

defineEmits<{ select: [prompt: string] }>();

const prompts = [
  'A JSON API that returns a random quote',
  'Redirect old URLs to new ones from a mapping',
  'A proxy that adds CORS headers to any API',
  'Return the current time in any timezone',
];
</script>
