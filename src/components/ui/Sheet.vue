<template>
  <Teleport to="body">
    <div v-if="open" class="ui-sheet-backdrop" @click.self="$emit('update:open', false)">
      <aside class="ui-sheet" :class="side">
        <slot />
      </aside>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    open: boolean;
    side?: 'left' | 'right';
  }>(),
  {
    side: 'right',
  },
);

defineEmits<{ 'update:open': [value: boolean] }>();
</script>
