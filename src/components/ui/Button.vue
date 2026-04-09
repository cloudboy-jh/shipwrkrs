<template>
  <component :is="as" class="ui-btn" :class="[`v-${variant}`, `s-${size}`]" v-bind="$attrs">
    <slot />
  </component>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    as?: string;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
  }>(),
  {
    as: 'button',
    variant: 'secondary',
    size: 'md',
  },
);
</script>
