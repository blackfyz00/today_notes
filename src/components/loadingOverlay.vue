<!-- components/LoadingOverlay.vue -->
<script setup lang="ts">
defineProps<{
  show: boolean
}>();
</script>

<template>
  <Transition name="fade">
    <div v-if="show" class="loading-overlay">
      <div class="spinner">Загрузка...</div>
    </div>
  </Transition>
</template>

<style scoped>
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 50;
}

.spinner {
  color: white;
  font-weight: bold;
  /* Добавьте сюда стили для вашего спиннера */
}

/* Простая анимация появления */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
