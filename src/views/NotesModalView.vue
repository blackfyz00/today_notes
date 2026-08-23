<!-- src/views/NotesModalView.vue -->
<template>
  <!-- Контролируется пропсом show, закрывается через closeModal -->
  <div v-if="show" class="notes-modal-overlay" @click="closeModal">
    <div class="notes-modal-content" @click.stop>
      
      <!-- Заголовок -->
      <div class="date-header">
        <div class="date-title">
          <h2>{{ formattedDate }}</h2>
          <p class="note-count">{{ currentNotes.length }} {{ getNoteCountText(currentNotes.length) }}</p>
        </div>
        <button v-if="!isMobile" class="close-btn" @click="closeModal">
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
        <button class="create-btn" @click="createNote">
        Создать заметку
        </button>
      </div>

      <!-- Сетка заметок -->
      <div v-else class="notes-grid">
          <button class="create-btn" @click="createNote">
          Создать заметку
          </button>
            <div v-for="note in currentNotes" 
                :key="note.id" 
                class="note-card"
                @click="editNote(note)">
            <div class="note-header">
                <span class="note-time">
                    {{ new Date(note.created_at || note.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
                </span>
                <h4 class="note-title">{{ note.title || 'Без названия' }}</h4>
                <button class="delete-btn" @click.stop="handleDeleteNote(note)" title="Удалить заметку">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </button>
            </div>
            <!-- Выводим реальный очищенный текст-превью, который подготовит скрипт -->
            <p class="note-content">{{ note.previewText || 'Пустая заметка...' }}</p>
            </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { LocalDB } from '@/services/IndexedDB'
import { ZipPacker } from '@/services/ZipPacker'
import { modalService } from '@/services/ModalService'
import NewNoteModal from './NewNoteModal.vue'
import { useTechnicalStore } from '@/services/TechnicalStore.ts'
import { stripMarkdown } from '@/services/utilsfuncs.ts'
import { useSyncStore } from '@/services/SyncStore'

const { t, locale } = useI18n()
const syncStore = useSyncStore()

const props = defineProps<{
  show: boolean;
  selectedDate: Date;
}>()

const emit = defineEmits(['close'])

const technicalStore = useTechnicalStore();
const isMobile = computed(() => technicalStore.isMobile)
const rawNotes = ref<any[]>([])
const currentNotes = computed(() => rawNotes.value)

/**
 * Загружает легкие объекты заметок, а затем по имени файла (filename) 
 * стягивает бинарники с диска для генерации превью
 */
 const loadNotesForDay = async () => {
   if (!props.selectedDate) return;
   
   // ✅ 1. Получаем все заметки (включая .deleted)
   const notes = await LocalDB.getNotesForDay(props.selectedDate);
   
   // ✅ 2. Фильтруем удаленные (просто скипаем)
   const activeNotes = notes.filter((note: any) => !note.deleted);
   
   // ✅ 3. Обрабатываем только активные заметки
   const processedNotes = await Promise.all(
     activeNotes.map(async (note: any) => {
       try {
         if (!note.filenameLink) throw new Error('Missing filenameLink');
         
         const fileBlob = await LocalDB.getFile(note.filenameLink);
         if (!fileBlob) throw new Error('File not found');
 
         const unpacked = await ZipPacker.unpack(fileBlob);
         const markdown: string = unpacked.doc.markdown;
         
         const markdownLines: string[] = markdown
           .split('\n')
           .map((line: string) => line.trim())
           .filter((line: string) => line.length > 0 && !line.startsWith('![') && !line.startsWith(']('));
         
         const firstLine: string = markdownLines[0] || '';
 
         const computedTitle: string = note.title && !note.title.startsWith('Note (') 
           ? note.title 
           : firstLine.replace(/^#+\s*/, '').trim() || 'No title';
         
         return {
           ...note,
           title: computedTitle,
           previewText: markdown.trim() ? truncate(markdown, 120) : 'Empty note...'
         };
         
       } catch (e) {
         console.error(`Error processing note file:`, e);
         return { 
           ...note, 
           title: note.title || 'Ошибка загрузки',
           previewText: '❌ Ошибка чтения файла'
         };
       }
     })
   );
   
   rawNotes.value = processedNotes;
 };
 
const closeModal = () => {
  emit('close');
}

const createNote = () => {
  const modalId = modalService.open(NewNoteModal, {
    selectedDate: props.selectedDate,
    isEditing: false,
    onClose: () => {
      modalService.close(modalId); 
      loadNotesForDay(); 
    }
  });
}

const editNote = (note: any) => {
  const modalId = modalService.open(NewNoteModal, {
    selectedDate: props.selectedDate,
    isEditing: true,
    note: note,
    onClose: () => {
      modalService.close(modalId); 
      loadNotesForDay();
    }
  });
}

/**
 * Исправленное физическое удаление файла .idoc по полному иерархическому пути
 */
 const handleDeleteNote = async (noteToDestroy: any) => {
   if (!noteToDestroy?.filenameLink) return;
 
   try {
     rawNotes.value = rawNotes.value.filter(n => n.id !== noteToDestroy.id);
     
     syncStore.deleteNote(noteToDestroy.filenameLink)
       .then(() => {
         console.log('✅ Note deleted from cloud');
         loadNotesForDay();
       })
       .catch((error) => {
         console.error('Error deleting note:', error);
       });
     
   } catch (error) {
     console.error('Error deleting note:', error);
     alert('Failed to move note to trash');
   }
 };

// --- Форматирование UI ---
const formattedDate = computed(() => {
  if (!props.selectedDate) return ''
  return new Intl.DateTimeFormat(locale.value, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(props.selectedDate)
})

const getNoteCountText = (count: number) => {
  if (count === 0) return 'заметок'
  if (count % 10 === 1 && count % 100 !== 11) return 'заметка'
  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return 'заметки'
  return 'заметок'
}

const formatDate = (isoString: string | undefined) => {
  if (!isoString) return ''
  const d = new Date(isoString)
  return d.toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit' })
}

const truncate = (str: string, len: number) => {
  if (!str) return ''
  const cleanStr = stripMarkdown(str)
  return cleanStr.length > len ? cleanStr.slice(0, len) + '...' : cleanStr
}

onMounted(loadNotesForDay);

watch(() => props.selectedDate, () => {
  loadNotesForDay();
});
</script>

<style scoped>
/* Оверлей модального окна */
.notes-modal-overlay {
  backdrop-filter: blur(2px);
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
  position: absolute;       
  right: 12px;              /* Задаем фиксированный отступ от правого края родителя */
  top: 12px;                /* Задаем фиксированный отступ от верхнего края родителя */
  
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
  z-index: 2;               /* Выводим на передний план, чтобы на неё можно было кликнуть */
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
  padding: 4rem 0rem;
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

.delete-btn {
  background: rgba(231, 76, 60, 0.2);
  border: 1px solid rgba(231, 76, 60, 0.3);
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #e74c3c;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(4px);
}

.delete-btn:hover {
  background: rgba(231, 76, 60, 0.9);
  border-color: rgba(231, 76, 60, 0.5);
  color: #ffffff;
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(231, 76, 60, 0.4);
}

.delete-btn:active {
  transform: scale(0.95);
}

.delete-btn svg {
  width: 16px;
  height: 16px;
  transition: filter 0.2s;
}

.delete-btn:hover svg {
  filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.5));
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
  color: #ffffff;
  word-break: break-word;
}

.note-content {
  padding: 0 1.25rem;
  margin-top: 1.5rem;
  font-size: 1rem;
  line-height: 1.5;
  color: var(--text-secondary, #a0a0a0);
  word-break: break-word;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3; /* Лимит строк */
  line-clamp: 3; 
  overflow: hidden;
  text-overflow: ellipsis;
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