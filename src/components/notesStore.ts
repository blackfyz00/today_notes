// src/components/notesStore.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Note {
  id: number
  user_id: number
  title: string | null
  in_day: string // Ожидаем формат YYYY-MM-DD
  content: string
  created_at: string
  updated_at: string
}

// Исправленный тип для статистики
// Бэкенд возвращает объект вида: { "2023-10-01": 5, "2023-10-02": 3 }
export type NoteStats = Record<string, number>

export const useNotesStore = defineStore('notes', () => {
  // === State ===
  const notesByDate = ref<Record<string, Note[]>>({})
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)
  
  // Состояние для статистики
  const stats = ref<NoteStats | null>(null)
  const isStatsLoading = ref<boolean>(false)

  // === Helpers ===
  
  const getDateKey = (input: Date | string | null): string | null => {
    if (!input) return null

    let year: number
    let month: number
    let day: number

    if (typeof input === 'string') {
      // Если строка уже в формате YYYY-MM-DD, просто возвращаем её
      if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
        return input
      }
      const d = new Date(input)
      if (isNaN(d.getTime())) return null
      year = d.getFullYear()
      month = d.getMonth() + 1
      day = d.getDate()
    } else {
      // Исправлено: используем 'input', так как это объект Date
      if (isNaN(input.getTime())) return null
      year = input.getFullYear()
      month = input.getMonth() + 1
      day = input.getDate()
    }

    const mm = String(month).padStart(2, '0')
    const dd = String(day).padStart(2, '0')
    return `${year}-${mm}-${dd}`
  }


  // Вспомогательная функция для обработки ошибок авторизации
  const handleAuthError = () => {
    localStorage.removeItem('token')
    error.value = 'Сессия истекла. Пожалуйста, войдите снова.'
    // Здесь можно добавить редирект на страницу логина, если есть роутер
    // router.push('/login') 
  }

  // === Getters ===
  
  const getNotesForDate = (date: Date | string | null): Note[] => {
    const key = getDateKey(date)
    if (!key) return []
    return notesByDate.value[key] || []
  }

  // === Actions ===

  const fetchNotes = async (date: Date | string): Promise<void> => {
    const key = getDateKey(date)
    
    if (!key) {
      console.error('Invalid date provided to fetchNotes:', date)
      error.value = 'Некорректная дата'
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        throw new Error('No authorization token found')
      }

      // ИСПРАВЛЕНИЕ 1: Добавляем параметр даты в URL
      const url = `/api/notes/?date=${key}`
      
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) {
        if (res.status === 401) {
          handleAuthError()
          throw new Error('Unauthorized')
        }
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }

      const data: Note[] = await res.json()
      
      // Сохраняем данные именно под ключом этой даты
      notesByDate.value[key] = data

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Ошибка загрузки заметок:', errorMessage)
      if (errorMessage !== 'Unauthorized') {
        error.value = errorMessage
      }
      // При ошибке оставляем пустой массив для этой даты, чтобы UI не ломался
      if (!notesByDate.value[key]) {
        notesByDate.value[key] = []
      }
    } finally {
      isLoading.value = false
    }
  }

  const fetchStats = async (): Promise<void> => {
    // ИСПРАВЛЕНИЕ 2: Убрали аргумент date, так как бэкенд отдает статистику по всем дням сразу
    
    isStatsLoading.value = true
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No token')
      }

      const res = await fetch(`/api/notes/stats`, { 
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) {
        if (res.status === 401) {
          handleAuthError()
          throw new Error('Unauthorized')
        }
        console.warn('Failed to fetch stats:', res.status)
        stats.value = null
        return
      }

      // ИСПРАВЛЕНИЕ 3: Типизация ответа теперь строго Record<string, number>
      const data = await res.json()
      stats.value = data as NoteStats

    } catch (e) {
      console.error('Error fetching stats:', e)
      stats.value = null
    } finally {
      isStatsLoading.value = false
    }
  }

  const updateNoteInState = (updatedNote: Note): void => {
    let wasFound = false
    let wasMoved = false
    // Гарантируем, что ключ даты в правильном формате
    const newDateKey = getDateKey(updatedNote.in_day)
    if (!newDateKey) return

    Object.keys(notesByDate.value).forEach((dateKey) => {
      const list = notesByDate.value[dateKey]
      if (!list) return 
      
      const index = list.findIndex((n) => n.id === updatedNote.id)
      
      if (index !== -1) {
        wasFound = true
        if (dateKey !== newDateKey) {
          list.splice(index, 1)
          wasMoved = true
        } else {
          list[index] = updatedNote
        }
      }
    })
    
    if (!wasFound || wasMoved) {
      if (!notesByDate.value[newDateKey]) {
        notesByDate.value[newDateKey] = []
      }
      
      const existsInTarget = notesByDate.value[newDateKey].some(n => n.id === updatedNote.id)
      
      if (!existsInTarget) {
        notesByDate.value[newDateKey].unshift(updatedNote)
      } else {
        const dupIndex = notesByDate.value[newDateKey].findIndex(n => n.id === updatedNote.id)
        notesByDate.value[newDateKey][dupIndex] = updatedNote
      }
    }
  }

  const addNoteToState = (newNote: Note): void => {
    const key = getDateKey(newNote.in_day)
    if (!key) return

    if (!notesByDate.value[key]) {
      notesByDate.value[key] = []
    }

    const exists = notesByDate.value[key].some(n => n.id === newNote.id)
    if (!exists) {
      notesByDate.value[key].unshift(newNote)
    }
  }

  const removeNoteFromState = (noteId: number): void => {
    Object.keys(notesByDate.value).forEach((dateKey) => {
      const list = notesByDate.value[dateKey]
      if (!list) return 
      const index = list.findIndex((n) => n.id === noteId)
      if (index !== -1) {
        list.splice(index, 1)
      }
    })
  }

  const clearCache = (): void => {
    notesByDate.value = {}
    stats.value = null
    error.value = null
  }

  // === Return ===
  return {
    notesByDate,
    isLoading,
    error,
    stats,
    isStatsLoading,
    getNotesForDate,
    fetchNotes,
    fetchStats,
    updateNoteInState,
    addNoteToState,
    removeNoteFromState,
    clearCache
  }
})