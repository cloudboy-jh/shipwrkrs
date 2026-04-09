<template>
  <Teleport to="body">
    <div v-if="open" class="ui-dialog-backdrop" @click.self="$emit('update:open', false)">
      <div class="ui-dialog">
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{ open: boolean }>();
defineEmits<{ 'update:open': [value: boolean] }>();
</script>
