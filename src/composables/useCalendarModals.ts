// src/composables/useCalendarModals.ts
import { ref } from 'vue'
import { useNotesStore } from '../components/notesStore'

export function useCalendarModals() {
  
  const notesStore = useNotesStore()
  // Состояние модалок
  const isNotesOpen = ref(false)
  const isNewNoteOpen = ref(false)
  const isMonthPickerOpen = ref(false)

  // Выбранная дата и заметка
  const selectedDate = ref<Date | null>(null)
  const selectedNote = ref<any>(null)
  const selectedDateStr = ref('')

  // Вспомогательная функция: безопасное получение ключа даты
  const getDateKeySafe = (dateObj: Date | null) => {
    if (!dateObj) return ''
    const y = dateObj.getFullYear()
    const m = String(dateObj.getMonth() + 1).padStart(2, '0')
    const d = String(dateObj.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const openNotesForDay = async (dateObj: Date) => { // Добавляем async
    if (!dateObj) return
    
    const key = getDateKeySafe(dateObj)
    selectedDateStr.value = key
    selectedDate.value = new Date(
      dateObj.getFullYear(),
      dateObj.getMonth(),
      dateObj.getDate()
    )

    // ВАЖНО: Загружаем заметки из API для этой даты
    // Пока идет загрузка, isLoading в сторе станет true
    await notesStore.fetchNotes(key) 
    
    isNotesOpen.value = true
  }

  // Открыть редактор новой заметки
  const openNewNoteEditor = () => {
    selectedNote.value = null
    isNewNoteOpen.value = true
  }

  // Открыть редактор для редактирования заметки
  const handleEditNote = (note: any) => {
    selectedNote.value = note
    isNewNoteOpen.value = true
  }

  // Открыть выбор месяца
  const openMonthPicker = () => {
    isMonthPickerOpen.value = true
  }

  // Закрыть все модалки (удобно для сброса)
  const closeAll = () => {
    isNotesOpen.value = false
    isNewNoteOpen.value = false
    isMonthPickerOpen.value = false
  }

  return {
    // состояния
    isNotesOpen,
    isNewNoteOpen,
    isMonthPickerOpen,
    selectedDate,
    selectedNote,
    selectedDateStr,
    // действия
    openNotesForDay,
    openNewNoteEditor,
    handleEditNote,
    openMonthPicker,
    closeAll,
    getDateKeySafe
  }
}