<template>
  <div class="ui-progress">
    <div class="ui-progress-bar" :style="{ width: `${Math.min(100, Math.max(0, value))}%` }" />
  </div>
</template>

<script setup lang="ts">
defineProps<{ value: number }>();
</script>
