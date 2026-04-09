<template>
  <div class="ui-scroll-area" :style="styleObject">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{ maxHeight?: string }>(), { maxHeight: '420px' });
const styleObject = computed(() => ({ maxHeight: props.maxHeight }));
</script>
