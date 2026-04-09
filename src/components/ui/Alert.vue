<template>
  <div class="ui-alert" :class="`v-${variant}`">
    <slot />
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'default' | 'error' | 'warning' | 'success';
  }>(),
  { variant: 'default' },
);
</script>
