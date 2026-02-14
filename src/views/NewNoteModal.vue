<!-- src/views/NewNoteModal.vue -->
<template>
  <Teleport to="body">
    <div v-if="modelValue" class="note-modal-overlay" @click="$emit('update:modelValue', false)">
      <div class="note-editor" @click.stop>
        <header class="editor-header">
          <button class="stdBtn back-btn" @click="$emit('update:modelValue', false)">←</button>
          <h1>{{ isEditing ? 'Редактировать' : 'Новая заметка' }}</h1>
        </header>

        <div class="toolbar">
          <button class="stdBtn" @click="toggleBold">B</button>
          <button class="stdBtn" @click="toggleItalic">I</button>
          <button class="stdBtn" @click="toggleList">⋮</button>
          <button class="stdBtn" @click="insertImage">📷</button>
          <button class="stdBtn" @click="recordVoice">🎤</button>
        </div>

        <div class="editor-area">
          <textarea 
            v-model="localContent"
            class="note-textarea"
            placeholder="Начните писать..."
            @input="isDirty = true"
          ></textarea>
        </div>

        <div class="editor-actions">
          <button class="submit-btn save-btn" @click="saveNote">Сохранить</button>
          <button v-if="isEditing" class="submit-btn delete-btn" @click="deleteNote">Удалить</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  content: { type: String, default: '' },
  isEditing: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'create', 'edit', 'delete'])

// Локальное состояние
const localContent = ref(props.content)
const isDirty = ref(false)

// Сброс при закрытии (опционально)
watch(() => props.modelValue, (isOpen) => {
  if (!isOpen) {
    localContent.value = props.content
    isDirty.value = false
  }
})

const saveNote = () => {
  const content = localContent.value.trim()
  if (!content) {
    alert('Заметка не может быть пустой')
    return
  }

  if (props.isEditing) {
    emit('edit', content)
  } else {
    emit('create', content)
  }
  emit('update:modelValue', false)
}

const deleteNote = () => {
  if (confirm('Удалить заметку?')) {
    emit('delete')
    emit('update:modelValue', false)
  }
}

// Заглушки для форматирования (реализуйте позже)
const toggleBold = () => console.log('Bold')
const toggleItalic = () => console.log('Italic')
const toggleList = () => console.log('List')
const insertImage = () => console.log('Insert image')
const recordVoice = () => console.log('Record voice')
</script>

<style scoped>
/* Use existing CSS variables without duplication */
.note-editor {
  background: var(--card-bg);
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 800px; 
  max-height: 90vh;
  overflow-y: auto;
}

.note-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  /* Измените align-items: stretch + padding через margin или внутренний отступ */
  z-index: 4;
  padding: 0; /* ← уберите padding здесь */
  box-sizing: border-box;
}

.note-editor {
  background: var(--card-bg);
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5); /* как в NotesModal */
  width: 100%;
  max-width: 800px;
  /* Занимаем всю высоту с отступами сверху/снизу */
  height: calc(100vh - 4rem); /* 2rem сверху + 2rem снизу = 4rem */
  margin: 2rem 1rem; /* эмулируем padding оверлея */
  display: flex;
  flex-direction: column;
  overflow: hidden; /* прокрутка будет внутри */
}

/* Остальное без изменений, но убедитесь: */
.editor-area {
  flex: 1;
  padding: 30px;
  display: flex;
  text-align: center;
  flex-direction: column;
  overflow-y: auto; /* ← прокрутка только в области текста */
}

.note-editor::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #3498db, #2ecc71);
}

.editor-header {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.editor-header h1 {
  flex: 1;
  text-align: center;
  color: var(--heading-color);
  font-size: 1.8rem;
  margin: 0;
  font-weight: 700;
}

.back-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text-primary);
  cursor: pointer;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s;
}

.back-btn:hover {
  background: var(--bg-secondary);
}

.toolbar {
  display: flex;
  padding: 12px 16px;
  gap: 10px;
  border-bottom: 1px solid var(--border-color);
}

.stdBtn {
  touch-action: manipulation;
  background: var(--bg-secondary);
  border: none;
  border-radius: 8px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.stdBtn:hover {
  background: var(--bg-primary);
  color: var(--text-primary);
  transform: translateY(-2px);
}

.note-textarea {
  flex: 1;
  width: 100%;
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--input-border);
  border-radius: 12px;
  font-size: 16px;
  color: var(--text-primary);
  background-color: var(--input-bg);
  outline: none;
  font-family: inherit;
  resize: none;
  min-height: 200px;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  overflow-x: hidden;
  overflow-y: auto;
}

.note-textarea:focus {
  border-color: #3498db;
  background-color: var(--bg-primary);
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.15);
}

.editor-actions {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.submit-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #34db74, #2980b9);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.submit-btn:hover {
  background: linear-gradient(135deg, #2980b9, #2573a7);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(52, 152, 219, 0.4);
}

.submit-btn:active {
  transform: translateY(0);
}

.delete-btn {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
}

.delete-btn:hover {
  background: linear-gradient(135deg, #c0392b, #a93226);
}

/* Responsive adjustments */
@media (max-width: 900px) {
  .note-editor {
    border-radius: 12px;
  }
  
  .editor-header h1 {
    font-size: 1.5rem;
  }
  
  .toolbar {
    padding: 10px 12px;
  }
  
  .stdBtn {
    width: 36px;
    height: 36px;
    font-size: 1rem;
  }
  
  .note-textarea {
    min-height: 160px;
  }
}
</style>