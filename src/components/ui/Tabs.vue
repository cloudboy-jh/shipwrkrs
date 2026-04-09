<template>
  <div class="ui-tabs" role="tablist">
    <button
      v-for="item in options"
      :key="item.value"
      type="button"
      role="tab"
      class="ui-tab"
      :class="{ active: modelValue === item.value }"
      @click="$emit('update:modelValue', item.value)"
    >
      <span v-if="item.icon">{{ item.icon }}</span>
      <span>{{ item.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string;
  options: Array<{ value: string; label: string; icon?: string }>;
}>();

defineEmits<{ 'update:modelValue': [value: string] }>();
</script>
