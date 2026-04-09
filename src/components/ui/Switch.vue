<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    class="ui-switch"
    :class="{ on: modelValue }"
    @click="$emit('update:modelValue', !modelValue)"
  >
    <span class="ui-switch-thumb" />
  </button>
</template>

<script setup lang="ts">
defineProps<{ modelValue: boolean }>();
defineEmits<{ 'update:modelValue': [value: boolean] }>();
</script>
