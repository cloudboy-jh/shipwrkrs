<template>
  <div class="ui-command">
    <input
      class="ui-input ui-command-input"
      :placeholder="placeholder"
      v-model="query"
      type="text"
    />
    <div class="ui-command-list">
      <button
        v-for="item in filtered"
        :key="item.value"
        type="button"
        class="ui-command-item"
        @click="$emit('select', item.value)"
      >
        {{ item.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

const props = withDefaults(
  defineProps<{
    placeholder?: string;
    items: Array<{ label: string; value: string }>;
  }>(),
  {
    placeholder: 'Search...',
  },
);

defineEmits<{ select: [value: string] }>();
const query = ref('');

const filtered = computed(() => {
  if (!query.value.trim()) return props.items;
  const q = query.value.toLowerCase();
  return props.items.filter((i) => i.label.toLowerCase().includes(q));
});
</script>
