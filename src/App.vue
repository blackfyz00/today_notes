<!-- src/App.vue -->
<template>
  <overlayState />

  <Sidebar v-if="isAuthorized" />
  <RouterView />
  <ModalManager />
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import Sidebar from '@/components/Sidebar.vue';
import overlayState from '@/components/overlayState/overlay.vue';
import ModalManager from '@/components/ModalManager.vue';
import { useTechnicalStore } from '@/services/TechnicalStore';

const technicalStore = useTechnicalStore();

// ==================== GETTERS ====================
const isAuthorized = computed(() => technicalStore.isAuthorized);

onMounted(() => {
  console.log('📱 Приложение загружено');
});

onUnmounted(() => {
});
</script>
