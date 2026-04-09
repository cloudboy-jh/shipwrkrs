<template>
  <span class="ui-tooltip" :title="text"><slot /></span>
</template>

<script setup lang="ts">
defineProps<{ text: string }>();
</script>
