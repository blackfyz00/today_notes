<!-- src/views/CheckNotes.vue -->
<template>
  <div class="notes-page">
    <!-- Заголовок даты -->
    <div class="date-header">
      <div class="date-title">
        <h2>{{ formattedDate }}</h2>
        <p class="note-count">{{ notes.length }} {{ getNoteCountText(notes.length) }}</p>
      </div>
      <button class="close-btn" @click="$emit('close')">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>

    <!-- Список заметок или пустое состояние -->
    <div v-if="isLoading" class="loading">
      <p>Загрузка...</p>
    </div>

    <div v-else-if="notes.length === 0" class="empty-state">
      <div class="empty-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: #3498db;">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      </div>
      <h3> {{t("Notes.noNotes")}}</h3>
      <p class="empty-subtext">
        {{t("Notes.noNoteslog")}}<br>
      </p>
      <button class="create-btn" @click="$emit('create-editor')">
        Создать заметку
      </button>
    </div>

    <div v-else class="notes-grid">
      <div v-for="note in notes" :key="note.id" class="note-card">
        <div class="note-header">
          <span class="note-time">{{ formatDate(note.created_at) }}</span>
          <button class="edit-btn" @click="$emit('edit', note)">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5"></path>
              <polyline points="18.5 2.5 21 5 16 10"></polyline>
            </svg>
          </button>
        </div>
        <h4 class="note-title">{{ note.title || 'Без названия' }}</h4>
        <p class="note-content">{{ truncate(note.content, 120) }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// Props & Emits
const props = defineProps({
  date: { type: Date, required: true }
})
const emit = defineEmits(['close', 'create', 'edit', 'create-editor'])

// State
const notes = ref([])
const isLoading = ref(true)

// Форматирование даты (например: "February 11, 2026")
const formattedDate = computed(() => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(props.date)
})

// Вспомогательные функции
const getNoteCountText = (count) => {
  if (count === 0) return 'заметок'
  if (count % 10 === 1 && count % 100 !== 11) return 'заметка'
  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return 'заметки'
  return 'заметок'
}

const formatDate = (isoString) => {
  const d = new Date(isoString)
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

const truncate = (str, len) => {
  if (!str) return ''
  return str.length > len ? str.slice(0, len) + '...' : str
}

// Имитация загрузки с сервера
onMounted(async () => {
  // Здесь можно заменить на реальный API-запрос:
  // const res = await fetch(`/api/notes?date=${props.date.toISOString().split('T')[0]}`)
  // notes.value = await res.json()

  // Для демонстрации — заглушка:
  await new Promise(r => setTimeout(r, 600))
  notes.value = [] // ← оставляем пустым, чтобы показать "нет заметок"
  isLoading.value = false
})
</script>

<style scoped>
.notes-page {
  background-color: var(--bg-secondary);
  min-height: 100vh;
  padding: 2rem 1rem;
  box-sizing: border-box;
  color: var(--text-primary);
}

/* Заголовок даты */
.date-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.date-title {
  text-align: center;
  flex-grow: 1;
  margin: 0 1rem;
}

.date-icon {
  width: 40px;
  height: 40px;
  background: rgba(52, 152, 219, 0.15);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.date-icon svg {
  width: 20px;
  height: 20px;
  color: #3498db; /* можно вынести в --accent, но оставим как акцент */
}

.date-header h2 {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.note-count {
  font-size: 0.95rem;
  color: var(--text-secondary);
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
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
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
  color: var(--text-primary);
  margin: 0 0 1rem;
}

.empty-subtext {
  font-size: 1.125rem;
  line-height: 1.6;
  color: var(--text-secondary);
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
}

.note-card {
  background: var(--card-bg);
  border-radius: 12px;
  overflow: hidden;
  backdrop-filter: blur(10px);
  border: 1px solid var(--border-color);
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
  background: rgba(25, 25, 32, 0.8); /* можно заменить на переменную, если нужно */
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.note-time {
  font-size: 0.875rem;
  color: var(--text-secondary);
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
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.edit-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
}

.edit-btn svg {
  width: 16px;
  height: 16px;
}

.note-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0.75rem 1.25rem;
  color: var(--text-primary);
  word-break: break-word;
}

.note-content {
  padding: 0 1.25rem 1.25rem;
  font-size: 1rem;
  line-height: 1.5;
  color: var(--text-secondary);
  word-break: break-word;
}

/* Загрузка */
.loading {
  text-align: center;
  padding: 4rem 1rem;
  color: var(--text-secondary);
}

/* Адаптивность */
@media (max-width: 600px) {
  .date-header {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }

  .notes-grid {
    grid-template-columns: 1fr;
  }

  .empty-state {
    padding: 3rem 1rem;
  }
}
</style>