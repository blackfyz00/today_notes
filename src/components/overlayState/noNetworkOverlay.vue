<!-- src/components/NetworkErrorOverlay.vue -->
<script setup lang="ts">
defineProps<{
  show: boolean;
}>();
</script>

<template>
  <Transition name="fade">
    <div 
      v-if="show" 
      class="corner-network-error"
    >
      <!-- Точная копия контейнера спиннера и обычной ошибки по размеру -->
      <div class="network-icon">
        <svg viewBox="0 0 100 100" xmlns="http://w3.org">
          <!-- Спокойный серый круг-подложка вместо агрессивного красного -->
          <circle cx="50" cy="50" r="42" class="network-bg" />
          <!-- Векторная иконка антенны/сигнала с линией отключения -->
          <path d="M35,65 L35,55 M50,65 L50,40 M65,65 L65,25" class="signal-bars" stroke-linecap="round" />
          <line x1="25" y1="25" x2="75" y2="75" class="disconnect-line" stroke-linecap="round" />
        </svg>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.corner-network-error {
  position: fixed;
  top: 20px; /* Фиксация в верхнем правом углу */
  right: 20px;
  z-index: 4;
  pointer-events: none; /* Пропускает клики сквозь себя */
}

/* Строгое соответствие размерам остальных оверлеев (32x32) */
.network-icon {
  width: 32px;
  height: 32px;
}

.network-icon svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.network-bg {
  fill: #757575; /* Серый цвет, сигнализирующий о потере связи */
}

.signal-bars {
  stroke: #ffffff;
  stroke-width: 8;
}

.disconnect-line {
  stroke: #db4437; /* Красная линия перечеркивания */
  stroke-width: 8;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
