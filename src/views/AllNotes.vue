<template>
  <div class="all-notes-page">
    <header class="page-header">
      <div class="header-content">
        <h1>{{ $t('Menu.notes') }}</h1>
        <p v-if="filteredNotes.length" class="total-count">
          {{ filteredNotes.length }} {{ getNoteCountText(filteredNotes.length) }}
        </p>
      </div>
    </header>

    <div class="search-bar">
      <input 
        v-model="searchQuery" 
        :placeholder="t('Notes.search_placeholder')" 
        type="text"
      />
    </div>

    <!-- Загрузка -->
    <div v-if="isLoading" class="notes-status">
      <div class="spinner"></div>
      <p>Загружаем ваши мысли...</p>
    </div>

    <!-- Пустое состояние -->
    <div v-else-if="filteredNotes.length === 0" class="empty-state-container">
      <div class="empty-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      </div>
      <h3>{{ searchQuery ? 'Ничего не найдено' : t("Notes.noNotes") }}</h3>
    </div>

    <!-- Сетка заметок -->
    <div v-else class="notes-grid">
      <div 
        v-for="note in filteredNotes" 
        :key="note.id" 
        class="note-card"
        @click="editNote(note)"
      >
        <div class="note-header">
          <span class="note-time">{{ formatDate(note.created_at) }}</span>
        </div>
        
        <h4 class="note-title">{{ note.title || 'Без названия' }}</h4>
        <p class="note-content">{{ stripMarkdown(note.content) }}</p>
      </div>
    </div>

    <div class="actions-footer">
      <button class="create-btn" @click="createNewNote">
        {{ t("Notes.create_new") || 'Создать заметку' }}
      </button>
    </div>

    <NewNoteModal
      v-model="isEditorOpen"
      :is-editing="!!selectedNote" 
      :note="selectedNote"
      :selected-date="selectedDate"
      :no-date-mode="true" 
      @update:model-value="onEditorClose"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import NewNoteModal from './NewNoteModal.vue';

const { t, locale } = useI18n();

const searchQuery = ref('');
const isLoading = ref(false);
const isEditorOpen = ref(false);
const selectedNote = ref(null);
const selectedDate = ref(new Date());

onMounted(async () => {
  isLoading.value = true;
  try {
    await notesStore.fetchNoDateNotes();
  } finally {
    isLoading.value = false;
  }
});

const filteredNotes = computed(() => {
  const all = notesStore.noDateNotes || [];
  if (!searchQuery.value) return all;
  const q = searchQuery.value.toLowerCase();
  return all.filter(n => 
    n.title?.toLowerCase().includes(q) || 
    n.content?.toLowerCase().includes(q)
  );
});

const createNewNote = () => {
  selectedNote.value = null;
  isEditorOpen.value = true;
};

const editNote = (note) => {
  selectedNote.value = note;
  isEditorOpen.value = true;
};

const onEditorClose = async (val) => {
  if (!val) {
    await notesStore.fetchNoDateNotes();
  }
};

const handleSave = async (noteData) => {
  await notesStore.saveNoDateNote(noteData);
  await notesStore.fetchNoDateNotes();
};

const getNoteCountText = (count) => {
  if (count % 10 === 1 && count % 100 !== 11) return 'заметка';
  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return 'заметки';
  return 'заметок';
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString(locale.value, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const stripMarkdown = (str) => {
  if (!str) return '';
  return str
    .replace(/```[\s\S]*?```/g, ' 💻 ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ➗ ')
    .replace(/\$[^\$]*?\$/g, ' ➗ ')
    .replace(/!\[(.*?)\]\(.*?\)/g, ' 🖼️ ')
    .replace(/<audio[\s\S]*?>(?:[\s\S]*?<\/audio>)?/gi, ' 🎧 ')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1 🔗')
    .replace(/^[#\s>]+|[*_`~]/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
};
</script>

<style scoped>
/* База страницы */
.all-notes-page {
  padding: 80px 20px 40px 100px;
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100vh;
  color: var(--text-primary, #ffffff);
}

@media (max-width: 768px) {
  .all-notes-page { padding: 100px 15px 20px 15px; }
}

.note-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4); 
  
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(8px); /* Для поддержки Safari */
  
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 4; /* Убедитесь, что это выше основного контента */
  
  transition: all 0.3s ease;
}

/* Хедер */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

/* Контейнер для центрирования кнопки под сеткой */
.actions-footer {
  display: flex;
  justify-content: center;
  margin-top: 40px;
  padding-bottom: 40px;
}

.create-btn {
  padding: 14px 40px;
  background: linear-gradient(135deg, #3498db, #2ecc71);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
}

.create-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(52, 152, 219, 0.4);
}

.create-btn:active {
  transform: translateY(0);
}

.total-count {
  color: var(--text-secondary, #a0a0a0);
  font-size: 0.9rem;
  margin: 0;
}

.add-note-btn {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3498db, #2ecc71);
  color: white;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(52, 152, 219, 0.4);
  transition: transform 0.2s;
}

.add-note-btn:hover { transform: scale(1.1); }

/* Поиск */
.search-bar input {
  width: 100%;
  padding: 14px 20px;
  border-radius: 14px;
  border: 1px solid var(--border-color, rgba(255,255,255,0.1));
  background: var(--card-bg, #1a1a2e);
  color: white;
  margin-bottom: 40px;
  font-size: 1rem;
}

/* Сетка */
.notes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

/* КАРТОЧКА (Стиль из твоей модалки) */
.note-card {
  background: var(--card-bg, #1a1a2e);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  transition: transform 0.3s, box-shadow 0.3s;
  cursor: pointer;
  display: flex;
  flex-direction: column;
}

.note-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
}

.note-header {
  padding: 8px 15px;
  background: linear-gradient(90deg, #3498db, #2ecc71);
  display: flex;
  justify-content: flex-start;
}

.note-time {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}

.note-title {
  font-size: 1.15rem;
  font-weight: 600;
  margin: 15px 15px 10px;
  color: #fff;
}

.note-content {
  padding: 0 15px 20px;
  font-size: 0.95rem;
  line-height: 1.5;
  color: #a0a0a0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Статусы */
.empty-state-container {
  text-align: center;
  padding: 60px 20px;
  color: #a0a0a0;
}

.empty-icon {
  margin-bottom: 20px;
  opacity: 0.5;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(52, 152, 219, 0.1);
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
</style>