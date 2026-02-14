<!-- src/views/NotesModal.vue -->
<template>
  <Teleport to="body">
    <div v-if="modelValue" class="notes-modal-overlay" @click="handleOverlayClick">
      <div class="notes-modal-content" @click.stop>
        <CheckNotes
          :date="date"
          @close="onClose"
          @create="onCreate"
          @edit="onEdit"
          @create-editor="$emit('create-editor')"
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
  modelValue: Boolean,
  date: { type: Date, required: true }
})

const emit = defineEmits(['update:modelValue', 'create', 'edit', 'create-editor'])

const close = () => emit('update:modelValue', false)
const handleOverlayClick = () => close()
const onClose = () => close()
const onCreate = (note) => emit('create', note)
const onEdit = (note) => emit('edit', note)

// Android back button
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
  if (removeListener) removeListener.then(l => l.remove())
})
</script>

<style scoped>
.notes-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6); /* полупрозрачный оверлей — не зависит от темы */
  display: flex;
  justify-content: center;
  align-items: flex-start; /* или center — по вашему усмотрению */
  z-index: 3;
  padding: 2rem 1rem 1rem;
  box-sizing: border-box;
}

.notes-modal-content {
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 16px;
  background: var(--card-bg); /* ← заменено на переменную */
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
}
</style>