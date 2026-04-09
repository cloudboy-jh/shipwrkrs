<template>
  <UiBadge :variant="variant">{{ label }}</UiBadge>
</template>

<script setup lang="ts">
import UiBadge from './ui/Badge.vue';

withDefaults(
  defineProps<{
    label: string;
    variant?: 'success' | 'warning' | 'error' | 'default';
  }>(),
  { variant: 'default' },
);
</script>
