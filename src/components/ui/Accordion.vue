<template>
  <details class="ui-accordion-item">
    <summary class="ui-accordion-trigger">{{ title }}</summary>
    <div class="ui-accordion-content">
      <slot />
    </div>
  </details>
</template>

<script setup lang="ts">
defineProps<{ title: string }>();
</script>
