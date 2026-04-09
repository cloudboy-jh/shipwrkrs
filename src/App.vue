<template>
  <div class="app-shell">
    <HeaderBar />
    <main class="main-wrap" :class="[`align-${verticalAlign}`]">
      <div class="page-frame" :style="frameStyle">
        <RouterView />
      </div>
    </main>
    <UiSonner />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import UiSonner from './components/ui/Sonner.vue';
import HeaderBar from './components/Header.vue';

const route = useRoute();

const routeWidth = computed(() => Number(route.meta.width ?? 560));
const verticalAlign = computed(() => String(route.meta.align ?? 'top'));
const frameStyle = computed(() => ({ maxWidth: `${routeWidth.value}px` }));
</script>
