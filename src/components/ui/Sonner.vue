<template>
  <div class="ui-sonner-wrap" aria-live="polite" aria-atomic="true">
    <div v-for="toast in toasts" :key="toast.id" class="ui-toast" :class="`v-${toast.variant}`">
      <div>
        <strong>{{ toast.title }}</strong>
        <p v-if="toast.message">{{ toast.message }}</p>
      </div>
      <button type="button" class="ui-toast-close" @click="dismiss(toast.id)">✕</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSonner } from './sonner';

const { toasts, dismiss } = useSonner();
</script>
