<script setup lang="ts">
defineProps<{
  show: boolean;
}>();

defineEmits(['close']);
</script>

<template>
  <Transition name="fade">
    <div 
      v-if="show" 
      class="corner-loader"
    >
      <!-- Спиннер -->
      <div class="dots-spinner">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <circle class="dot blue-dot" cx="50" cy="50" r="14" />
          <circle class="dot green-dot" cx="50" cy="50" r="14" />
        </svg>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.corner-loader {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 4;
  pointer-events: none;
}

.dots-spinner {
  width: 32px;
  height: 32px;
}

.dots-spinner svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}

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

.error-block {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0,0,0,0.85);
  padding: 8px 12px;
  border-radius: 20px;
  backdrop-filter: blur(10px);
}

.error-icon {
  font-size: 1.2rem;
}

.close-btn {
  background: #db4437;
  border: none;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>