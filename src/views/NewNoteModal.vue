<!-- src/views/NewNoteModal.vue -->
<template>
  <Teleport to="body">
    <div v-if="modelValue" class="note-modal-overlay" @click="$emit('update:modelValue', false)">
      <div class="note-editor" @click.stop>
        <header class="editor-header">
          <button class="stdBtn back-btn" @click="$emit('update:modelValue', false)">←</button>
          <h1 class="editor-title">{{ isEditing ? t('NewNote.edit') : t('NewNote.newNote') }}</h1>
        </header>

        <div class="toolbar">
          <button class="stdBtn" @click="toggleBold">B</button>
          <button class="stdBtn" @click="toggleItalic">I</button>
          <button class="stdBtn" @click="toggleList">⋮</button>
          <button class="stdBtn" @click="insertImage">📷</button>
          <button class="stdBtn" @click="recordVoice">🎤</button>
        </div>

        <div class="editor-area">
          <input 
            maxlength="15"
            v-model="localTitle"
            class="note-title-input"
            :placeholder="t('NewNote.title_placeholder')"
            @input="isDirty = true"
            :disabled="isLoading"
          />
          
          <textarea 
            v-model="localContent"
            class="note-textarea"
            :placeholder="t('NewNote.start_typing')"
            @input="isDirty = true"
            :disabled="isLoading"
          ></textarea>
        </div>

        <div class="editor-actions">
          <button class="submit-btn save-btn" @click="saveNote">{{t("NewNote.save")}}</button>
          <button v-if="isEditing" class="submit-btn delete-btn" @click="deleteNote">{{t("NewNote.delete")}}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNotesStore } from '../components/notesStore' // Проверьте путь
import { apiRequest } from '@/api/apiClient' 

const { t } = useI18n()
const notesStore = useNotesStore()

const props = defineProps({
  modelValue: Boolean,
  note: { type: Object, default: null },
  content: { type: String, default: '' }, // Лишний проп? У вас есть localContent
  isEditing: { type: Boolean, default: false },
  selectedDate: { type: [String, Date], default: null } 
})

const emit = defineEmits(['update:modelValue'])

const localTitle = ref('')
const localContent = ref('')
const isDirty = ref(false)
const isLoading = ref(false)

// Функция для безопасного заполнения полей
const fillFormFromNote = (noteObj) => {
  if (!noteObj) return
  
  // Используем nextTick, чтобы убедиться, что DOM и реактивность готовы
  nextTick(() => {
    localTitle.value = noteObj.title || ''
    localContent.value = noteObj.content || ''
    // Сбрасываем флаг загрязнения, так как это "чистое" состояние при загрузке
    isDirty.value = false 
  })
}

// Следим за открытием модального окна ИЛИ изменением заметки
watch(
  () => [props.modelValue, props.note, props.isEditing], 
  ([isOpen, newNote, isEdit]) => {
    if (isOpen && isEdit && newNote) {
      // Если окно открыто, режим редактирования и есть заметка -> заполняем
      fillFormFromNote(newNote)
    } else if (!isOpen) {
      isDirty.value = false
      isLoading.value = false
    } else if (isOpen && !isEdit) {
      localTitle.value = ''
      localContent.value = ''
      isDirty.value = false
    }
  },
  { immediate: true } // Запустить сразу при монтировании, если уже открыто
)

// Вспомогательная функция: получение даты
const getInDayValue = () => {
  if (props.isEditing && props.note) {
    const originalDate = props.note.in_day
    if (originalDate) {
      if (typeof originalDate === 'string') {
        return originalDate.split('T')[0]
      }
      if (originalDate instanceof Date) {
        const year = originalDate.getFullYear()
        const month = String(originalDate.getMonth() + 1).padStart(2, '0')
        const day = String(originalDate.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }
      return originalDate
    }
  }

  // Для новой заметки берем из selectedDate
  if (props.selectedDate) {
    if (typeof props.selectedDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(props.selectedDate)) {
      return props.selectedDate
    }
    if (props.selectedDate instanceof Date && !isNaN(props.selectedDate.getTime())) {
      const year = props.selectedDate.getFullYear()
      const month = String(props.selectedDate.getMonth() + 1).padStart(2, '0')
      const day = String(props.selectedDate.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
  }

  // Fallback: сегодня
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const saveNote = async () => {
  const title = localTitle.value.trim()
  const content = localContent.value.trim()
  
  if (!content && !title) {
    alert(t('NewNote.empty_error'))
    return
  }

  const inDayValue = getInDayValue()
  isLoading.value = true
  
  try {
    let savedNote

    if (props.isEditing && props.note?.id) {
      // === РЕДАКТИРОВАНИЕ ===
      const payload = { 
        title, 
        content
      }

      const response = await apiRequest(`/api/notes/${props.note.id}`, {
        method: 'PUT',
        body: payload
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || 'Ошибка обновления')
      }

      // Читаем тело ответа ТОЛЬКО ОДИН РАЗ здесь
      savedNote = await response.json()
      
      notesStore.updateNoteInState(savedNote)
      
    } else {
      // === СОЗДАНИЕ ===
      const payload = { 
        title, 
        content,
        in_day: inDayValue 
      }

      const response = await apiRequest('/api/notes/', {
        method: 'POST',
        body: payload
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || 'Ошибка создания')
      }

      // Читаем тело ответа ТОЛЬКО ОДИН РАЗ здесь
      savedNote = await response.json()
      
      notesStore.addNoteToState(savedNote)
    }
    
    emit('update:modelValue', false)
    
  } catch (error) {
    console.error('Ошибка сохранения:', error)
    
    // Обработка специфических ошибок
    if (error.message.includes('Unauthorized') || error.message.includes('Сессия')) {
       // Логика выхода уже есть в store или apiClient
    } else {
       alert(error.message || t('NewNote.save_error'))
    }
  } finally {
    isLoading.value = false
  }
}

const deleteNote = async () => {
  if (!props.note?.id) return
  if (!confirm(t('NewNote.delete_confirm'))) return
  
  isLoading.value = true
  try {
    const token = localStorage.getItem('token')
    // Используйте apiRequest и для DELETE:
    const res = await apiRequest(`/api/notes/${props.note.id}`, {
      method: 'DELETE'
    })
        
    if (!res.ok) throw new Error('Failed to delete')
    
    notesStore.removeNoteFromState(props.note.id)
    emit('update:modelValue', false)
  } catch (error) {
    console.error('Ошибка удаления:', error)
    alert(t('NewNote.delete_error'))
  } finally {
    isLoading.value = false
  }
}

// Заглушки
const toggleBold = () => document.execCommand?.('bold')
const toggleItalic = () => document.execCommand?.('italic')
const toggleList = () => document.execCommand?.('insertUnorderedList')
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
  padding: 10px;
  padding-inline: 30px;
  display: flex;
  align-items: center;   
  text-align: center;
  flex-direction: column;
}

.note-title-input{
  width: 50%;
  min-width: 0;
  padding: 5px;
  margin: 5px;
  border: 1px solid var(--input-border);
  border-radius: 12px;
  text-align: center;
  font-size: 16px;
  color: var(--text-primary);
  background-color: var(--input-bg);
  outline: none;
  font-family: inherit;
  resize: none;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  overflow-x: hidden;
  overflow-y: auto;
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
  justify-content: flex;
  position: relative;
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.editor-title {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  color: var(--heading-color);
  font-size: 1.8rem;
  font-weight: 700;
  margin: 0;
  white-space: nowrap;
  /* Если заголовок длинный — уберите white-space и добавьте max-width */
}

.toolbar {
  display: flex;
  padding: 12px 16px;
  justify-content: center;
  gap: 10px;
  border-bottom: 1px solid var(--border-color);
}

.stdBtn {
  touch-action: manipulation;
  background: var(--bg-secondary);
  border: none;
  border-radius: 8px;
  width: 50px;
  height: 50px;
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

.back-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text-primary);
  cursor: pointer;
  width: 100px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s;
  left: 20px;
}

.back-btn:hover {
  background: var(--bg-secondary);
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