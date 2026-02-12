<!-- src/components/NotesModal.vue -->
<template>
  <Teleport to="body">
    <div v-if="modelValue" class="notes-modal-overlay" @click="handleOverlayClick">
      <div class="notes-modal-content" @click.stop>
        <CheckNotes
          :date="date"
          @close="onClose"
          @create="onCreate"
          @edit="onEdit"
        />
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { App } from '@capacitor/app'
import CheckNotes from './CheckNotes.vue'

const props = defineProps({
  modelValue: Boolean, // v-model
  date: { type: Date, required: true }
})

const emit = defineEmits(['update:modelValue', 'create', 'edit'])

const close = () => {
  emit('update:modelValue', false)
}

const handleOverlayClick = () => {
  close()
}

const onClose = () => close()
const onCreate = (note) => emit('create', note)
const onEdit = (note) => emit('edit', note)

// Android Back Button
let removeListener
onMounted(() => {
  if (props.modelValue) {
    removeListener = App.addListener('backButton', (e) => {
      e.preventDefault()
      close()
    })
  }
})

onUnmounted(() => {
  if (removeListener) {
    removeListener.then(listener => listener.remove())
  }
})
</script>

<style scoped>
.notes-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: flex-start; /* можно поменять на center */
  z-index: 9999;
  padding: 2rem 1rem 1rem;
  box-sizing: border-box;
}

.notes-modal-content {
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 16px;
  background: #1e1e24; /* фон из вашего стиля */
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
}
</style>