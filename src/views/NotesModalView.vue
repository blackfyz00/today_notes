<!-- src/views/NotesModalView.vue -->
<template>
  <Teleport to="body">
    <LoadingOverlay :show="snapshot.matches('loading')" />
    <div v-if="modelValue" class="notes-modal-overlay" @click="$emit('update:modelValue', false)">
      <div class="notes-modal-content" @click.stop>
        
        <!-- Заголовок -->
        <div class="date-header">
          <div class="date-title">
            <h2>{{ formattedDate }}</h2>
            <!-- Берем длину напрямую из геттера стора -->
            <p class="note-count">{{ currentNotes.length }} {{ getNoteCountText(currentNotes.length) }}</p>
          </div>
          <button class="close-btn" @click="$emit('update:modelValue', false)">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Пустое состояние -->
        <div v-if="currentNotes.length === 0" class="empty-state">
          <div class="empty-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: #3498db;">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <h3>{{ t("Notes.noNotes") }}</h3>
          <p class="empty-subtext">{{ t("Notes.noNoteslog") }}</p>
          <button class="create-btn" @click="$emit('create-editor')">
            Создать заметку
          </button>
        </div>

        <!-- Сетка заметок -->
        <div v-else class="notes-grid">
          <div v-for="note in currentNotes" 
            :key="note.id" 
            class="note-card"
            @click="emit('edit-note', note)" 
            style="cursor: pointer;">
              <div class="note-header">
                <span class="note-time">{{ formatDate(note.updated_at) }}</span>
              </div>
              <h4 class="note-title">{{ note.title || 'Без названия' }}</h4>
              <p class="note-content">{{ truncate(note.content, 120) }}</p>
          </div>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { App } from '@capacitor/app'
import { useNotesStore } from '../components/notesStore' // Импорт стора

import LoadingOverlay from '../components/loadingOverlay.vue'
import { useMachine } from '@xstate/vue';
import { loadingMachine } from '../composables/xstate';

const { snapshot, send } = useMachine(loadingMachine);


const { t, locale } = useI18n()
const store = useNotesStore() // Инициализация стора

const props = defineProps({
  modelValue: Boolean,
  date: { type: Date, required: true }
})

const emit = defineEmits([
  'update:modelValue', 
  'create-editor',   
  'edit-note'         
])

let backBtnListener = null

// Вычисляемое свойство: берем данные прямо из стора для текущей даты
const currentNotes = computed(() => store.getNotesForDate(props.date))

const formattedDate = computed(() => {
  if (!props.date) return ''
  const currentLocale = locale.value
  return new Intl.DateTimeFormat(currentLocale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(props.date)
})

const getNoteCountText = (count) => {
  if (count === 0) return 'заметок'
  if (count % 10 === 1 && count % 100 !== 11) return 'заметка'
  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return 'заметки'
  return 'заметок'
}

const formatDate = (isoString) => {
  if (!isoString) return ''
  const d = new Date(isoString)
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

const truncate = (str, len) => {
  if (!str) return ''
  return str.length > len ? str.slice(0, len) + '...' : str
}

// Обработка кнопки "Назад"
const registerBackButton = () => {
  if (backBtnListener) return
  backBtnListener = App.addListener('backButton', (e) => {
    e.preventDefault()
    emit('update:modelValue', false)
  })
}

const loadNotes = async (date) => {
  if (!date) return;
  send({ type: 'FETCH' }); // Показываем глобальный лоадер
  try {
    await store.fetchNotes(date);
    send({ type: 'SUCCESS' });
  } catch (err) {
    send({ type: 'ERROR' });
  }
};

const unregisterBackButton = () => { 
  if (backBtnListener) {
    backBtnListener.remove() 
    backBtnListener = null
  }
}

onMounted(() => {
  if (props.modelValue) {
    registerBackButton();
    loadNotes(props.date); // С лоадером
  }
});

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    registerBackButton();
    loadNotes(props.date); // С лоадером
  } else {
    unregisterBackButton();
  }
});

watch(() => props.date, (newDate) => {
  if (props.modelValue) {
    loadNotes(newDate); // С лоадером
  }
});

</script>

<style scoped>
/* Оверлей модального окна */
.notes-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  z-index: 3;
  padding: 2rem 1rem 1rem;
  box-sizing: border-box;
  overflow-y: auto;
}

/* Контент модального окна */
.notes-modal-content {
  width: 90%;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 16px;
  align-items: center;
  background: var(--card-bg, #1a1a2e);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  margin: 1rem auto;
}

/* Основная страница заметок */
.notes-page {
  background-color: var(--bg-secondary, #16213e);
  min-height: 100vh;
  padding: 2rem 1rem;
  box-sizing: border-box;
  color: var(--text-primary, #ffffff);
}

/* Заголовок даты */
.date-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
}

.date-title {
  text-align: center;
  flex-grow: 1;
  margin: 0 1rem;
}

.date-header h2 {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary, #ffffff);
  margin: 0;
}

.note-count {
  font-size: 0.95rem;
  color: var(--text-secondary, #a0a0a0);
  margin: 0.25rem 0 0;
  font-weight: 400;
}

.close-btn {
  background: none;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary, #a0a0a0);
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary, #ffffff);
}

.close-btn svg {
  width: 18px;
  height: 18px;
}

/* Пустое состояние */
.empty-state {
  text-align: center;
  padding: 4rem 1rem;
  max-width: 500px;
  margin: 0 auto;
}

.empty-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 1.5rem;
  background: rgba(52, 152, 219, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-icon svg {
  width: 32px;
  height: 32px;
  color: #3498db;
}

.empty-state h3 {
  font-size: 1.875rem;
  font-weight: 700;
  color: var(--text-primary, #ffffff);
  margin: 0 0 1rem;
}

.empty-subtext {
  font-size: 1.125rem;
  line-height: 1.6;
  color: var(--text-secondary, #a0a0a0);
  max-width: 400px;
  margin: 0 auto 2rem;
}

.create-btn {
  padding: 14px 32px;
  background: linear-gradient(135deg, #3498db, #2ecc71);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
}

.create-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(52, 152, 219, 0.4);
}

.create-btn:active {
  transform: translateY(0);
}

/* Сетка заметок */
.notes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 1.5rem 1.5rem;
}

.note-card {
  background: var(--card-bg, #1a1a2e);
  border-radius: 12px;
  overflow: hidden;
  backdrop-filter: blur(10px);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  transition: transform 0.3s, box-shadow 0.3s;
}

.note-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
}

.note-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  background: linear-gradient(90deg, #3498db, #2ecc71);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.note-time {
  font-size: 0.875rem;
  color: var(--bg-primary, #a0a0a0);
}

.edit-btn {
  background: none;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--bg-primary, #a0a0a0);
  cursor: pointer;
  transition: all 0.2s;
}

.edit-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary, #ffffff);
}

.edit-btn svg {
  width: 16px;
  height: 16px;
}

.note-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0.75rem 1.25rem;
  color: var(--text-primary, #ffffff);
  word-break: break-word;
}

.note-content {
  padding: 0 1.25rem 1.25rem;
  font-size: 1rem;
  line-height: 1.5;
  color: var(--text-secondary, #a0a0a0);
  word-break: break-word;
}

/* Загрузка */
.loading {
  text-align: center;
  padding: 4rem 1rem;
  color: var(--text-secondary, #a0a0a0);
}

/* Адаптивность */
@media (max-width: 600px) {
  .notes-modal-overlay {
    padding: 1rem 0.5rem 0.5rem;
    align-items: flex-start;
  }

  .notes-modal-content {
    max-height: 95vh;
    border-radius: 12px;
    margin: 0.5rem auto;
  }

  .date-header {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
    padding: 1rem;
  }

  .date-title {
    margin: 0;
  }

  .notes-grid {
    grid-template-columns: 1fr;
    padding: 0 1rem 1rem;
  }

  .empty-state {
    padding: 3rem 1rem;
  }

  .empty-state h3 {
    font-size: 1.5rem;
  }

  .empty-subtext {
    font-size: 1rem;
  }
}

/* Скроллбар для модального окна */
.notes-modal-content::-webkit-scrollbar {
  width: 6px;
}

.notes-modal-content::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.notes-modal-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.notes-modal-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>