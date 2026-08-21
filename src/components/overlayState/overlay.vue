<!-- src/components/UniversalOverlay.vue -->
<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { useTechnicalStore } from '@/services/TechnicalStore';

const technicalStore = useTechnicalStore();
const { status } = storeToRefs(technicalStore);

// Определяем, показывать ли оверлей
const showOverlay = computed(() => {
  return status.value !== 'success';
});

// Определяем тип текущего состояния
const currentType = computed(() => status.value);
</script>

<template>
  <Transition name="fade">
    <div 
      v-if="showOverlay" 
      class="universal-overlay"
      :class="{
        'overlay-loading': currentType === 'loading',
        'overlay-error': currentType === 'error',
        'overlay-no-network': currentType === 'no_network'
      }"
    >
      <!-- Загрузка (спиннер) - нижний правый угол -->
      <div v-if="currentType === 'loading'" class="overlay-icon">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <circle class="dot blue-dot" cx="50" cy="50" r="14" />
          <circle class="dot green-dot" cx="50" cy="50" r="14" />
        </svg>
      </div>

      <!-- Ошибка (красный треугольник) - верхний правый угол -->
      <div v-else-if="currentType === 'error'" class="overlay-icon">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="42" class="alert-bg" />
          <path d="M50,28 L50,58" class="alert-line" stroke-linecap="round" />
          <circle cx="50" cy="74" r="6" class="alert-dot" />
        </svg>
      </div>

      <!-- Нет сети (серый сигнал с перечеркиванием) - верхний правый угол -->
      <div v-else-if="currentType === 'no_network'" class="overlay-icon">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="42" class="network-bg" />
          <path d="M35,65 L35,55 M50,65 L50,40 M65,65 L65,25" class="signal-bars" stroke-linecap="round" />
          <line x1="25" y1="25" x2="75" y2="75" class="disconnect-line" stroke-linecap="round" />
        </svg>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.universal-overlay {
  position: fixed;
  z-index: 4;
  pointer-events: none;
}

/* Загрузка - нижний правый угол */
.overlay-loading {
  bottom: 20px;
  right: 20px;
}

/* Ошибка и нет сети - верхний правый угол */
.overlay-error,
.overlay-no-network {
  top: 20px;
  right: 20px;
}

.overlay-icon {
  width: 32px;
  height: 32px;
}

.overlay-icon svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}

/* === Стили для спиннера (загрузка) === */
.dot {
  transform-origin: 50px 50px;
}

.blue-dot {
  fill: #4285F4;
  animation: orbit-blue 1.5s linear infinite;
}

.green-dot {
  fill: #34A853;
  animation: orbit-green 1.5s linear infinite;
}

@keyframes orbit-blue {
  0%   { transform: rotate(0deg) translateX(-22px); }
  100% { transform: rotate(360deg) translateX(-22px); }
}

@keyframes orbit-green {
  0%   { transform: rotate(0deg) translateX(22px); }
  100% { transform: rotate(360deg) translateX(22px); }
}

/* === Стили для ошибки === */
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

/* === Стили для нет сети === */
.network-bg {
  fill: #757575;
}

.signal-bars {
  stroke: #ffffff;
  stroke-width: 8;
}

.disconnect-line {
  stroke: #db4437;
  stroke-width: 8;
}

/* === Анимация появления/исчезновения === */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>