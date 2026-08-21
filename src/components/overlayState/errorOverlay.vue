<!-- src/components/CornerError.vue -->
<script setup lang="ts">
defineProps<{
  show: boolean;
}>();
</script>

<template>
  <Transition name="fade">
    <div 
      v-if="show" 
      class="corner-error"
    >
      <!-- Точная копия контейнера спиннера по размеру -->
      <div class="error-icon">
        <svg viewBox="0 0 100 100" xmlns="http://w3.org">
          <circle cx="50" cy="50" r="42" class="alert-bg" />
          <path d="M50,28 L50,58" class="alert-line" stroke-linecap="round" />
          <circle cx="50" cy="74" r="6" class="alert-dot" />
        </svg>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.corner-error {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 4;
  pointer-events: none; /* Пропускает клики сквозь себя, как и лоадер */
}

/* Полное соответствие размерам .dots-spinner (32x32) */
.error-icon {
  width: 32px;
  height: 32px;
}

.error-icon svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.alert-bg {
  fill: #db4437;
}

.alert-line {
  stroke: white;
  stroke-width: 10;
}

.alert-dot {
  fill: white;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
