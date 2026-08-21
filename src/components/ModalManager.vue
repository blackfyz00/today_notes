<!-- src/components/ModalManager.vue -->
<template>
  <Teleport to="body">
    <div 
      v-for="(modal, index) in modalService.getModals()" 
      :key="modal.id"
      class="modal-stack-layer"
      :style="{ zIndex: 3 + index }" 
    >
      <!-- Передаем show="true" и слушаем событие close -->
      <component
        :is="modal.component"
        v-bind="modal.props"
        :show="true"
        @close="modalService.close(modal.id)"
      />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { modalService } from '@/services/ModalService';
</script>

<style scoped>
.modal-stack-layer {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none; /* Пропускает клики сквозь прозрачные слои */
}
.modal-stack-layer > * {
  pointer-events: auto; /* Возвращает кликабельность контенту модалки */
}
</style>
