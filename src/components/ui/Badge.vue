<template>
  <span class="ui-badge" :class="`v-${variant}`"><slot /></span>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'default' | 'success' | 'warning' | 'error';
  }>(),
  { variant: 'default' },
);
</script>
