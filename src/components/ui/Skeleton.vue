<template>
  <div class="ui-skeleton" :style="styleObject" />
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    width?: string;
    height?: string;
  }>(),
  {
    width: '100%',
    height: '16px',
  },
);

const styleObject = computed(() => ({ width: props.width, height: props.height }));
</script>
