<!-- src/App.vue -->
<template>
  <overlayState />
  <Sidebar v-if="technicalStore.isAuthorized" />
  <RouterView />
  <ModalManager />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import Sidebar from '@/components/Sidebar.vue';
import overlayState from '@/components/overlayState/overlay.vue';
import ModalManager from '@/components/ModalManager.vue';
import { useTechnicalStore } from '@/services/TechnicalStore';
import { useSyncStore } from '@/services/SyncStore'; // ← импорт

const technicalStore = useTechnicalStore();
const syncStore = useSyncStore(); // ← получаем экземпляр

onMounted(() => {
  console.log('📱 Приложение загружено');
  
  // ✅ ЗАПУСКАЕМ ПЕРИОДИЧЕСКУЮ СИНХРОНИЗАЦИЮ
  // 5 минут = 300000 мс
  syncStore.startPeriodicSync(300000);
});

onUnmounted(() => {
  // ✅ ОСТАНАВЛИВАЕМ ПРИ УХОДЕ (опционально)
  syncStore.stopPeriodicSync();
});
</script>