<template>
  <details class="ui-dropdown" @toggle="open = $event.target instanceof HTMLDetailsElement ? $event.target.open : false">
    <summary class="ui-dropdown-trigger">{{ label }}</summary>
    <div class="ui-dropdown-content" v-if="open">
      <slot />
    </div>
  </details>
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineProps<{ label: string }>();
const open = ref(false);
</script>
