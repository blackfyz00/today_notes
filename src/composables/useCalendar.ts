// src/composables/useCalendarDates.ts
import { ref, computed } from 'vue'
import { modalService } from '@/services/ModalService'
import MonthPickerModal from '@/views/MonthPickerModal.vue'
import type { IMonthStats } from '@/interfaces/IMonthStats'
import { useTechnicalStore } from '@/services/TechnicalStore'
import { LocalDB } from '@/services/IndexedDB'
import NewNoteModal from '@/views/NewNoteModal.vue'
import { useI18n } from 'vue-i18n'
import NotesModalView from '@/views/NotesModalView.vue'

export function useCalendarDates() {
    const technicalStore = useTechnicalStore()
    const currentDate = ref(new Date())
    const currentMonthStats = ref<IMonthStats[]>([])
    const { t } = useI18n()
    
    // Форматируем дату в строку "YYYY-MM-DD"
    const formatDateKey = (date: Date) => {
        const y = date.getFullYear()
        const m = String(date.getMonth() + 1).padStart(2, '0')
        const d = String(date.getDate()).padStart(2, '0')
        return `${y}-${m}-${d}`
    }

    
    let touchStartX = 0
    let touchEndX = 0
    const minSwipeDistance = 50
  
    const onTouchStart = (e: TouchEvent) => {
        touchStartX = e.touches[0]!.clientX
    }
  
    const onTouchEnd = (e: TouchEvent) => {
        touchEndX = e.changedTouches[0]!.clientX
        const diff = touchEndX - touchStartX
    
        if (Math.abs(diff) < minSwipeDistance) return
    
        if (diff > 0) {
            prevMonth()
        } else {
            nextMonth()
        }
    }
  
    // === Локализация и Ключи UI ===
    const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
    const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  
    const thisMonth = computed(() => {
        const monthIndex = currentDate.value.getMonth()
        return t(`Calendar.months.${monthKeys[monthIndex]}`)
    })
  
    const nameDays = computed(() => {
        return dayKeys.map((key: string) => t(`Calendar.days.${key}`))
    })
  
    const onMonthSelect = (newDate: Date) => {
        currentDate.value = newDate
    }


    // Генерируем 42 дня для сетки календаря
    const days = computed(() => {
        const now = new Date()
        const todayKey = formatDateKey(now)
        const year = currentDate.value.getFullYear()
        const month = currentDate.value.getMonth()

        const firstDay = new Date(year, month, 1).getDay()
        const startOffset = firstDay === 0 ? -6 : 1 - firstDay

        const result = []
        for (let i = 0; i < 42; i++) {
            const date = new Date(year, month, startOffset + i)
            const dateKey = formatDateKey(date)
            const dayOfWeek = i % 7

            result.push({
                date: date.getDate(),
                isOtherMonth: date.getMonth() !== month,
                isToday: dateKey === todayKey,
                isWeekend: dayOfWeek === 5 || dayOfWeek === 6,
                fullDate: date,
                dateKey: dateKey
            })
        }
        return result
    })

    const onToday = () => {
        currentDate.value = new Date()
    }
  
    const prevMonth = () => {
        const d = new Date(currentDate.value)
        d.setMonth(d.getMonth() - 1)
        currentDate.value = d
    }

    const nextMonth = () => {
        const d = new Date(currentDate.value)
        d.setMonth(d.getMonth() + 1)
        currentDate.value = d
    }

    const openMonthPicker = () => {
        const modalId = modalService.open(MonthPickerModal, {
            currentDate: currentDate.value,
            onSelect: (selectedDate: Date) => {
                currentDate.value = selectedDate // ✅ Если currentDate - ref
            },
            onClose: () => {
                modalService.close(modalId)
            }
        })
    }

    // ✅ Реактивная карта статистики
    const monthStatsMap = computed(() => {
        const map = new Map<string, number>()
    
        currentMonthStats.value.forEach((stat: IMonthStats) => {
            if (stat.date instanceof Date) {
                const year = stat.date.getFullYear()
                const month = String(stat.date.getMonth() + 1).padStart(2, "0")
                const day = String(stat.date.getDate()).padStart(2, "0")
                const dateKey = `${year}-${month}-${day}`
                map.set(dateKey, stat.totalNotes)
            }
        })
        return map
    })
    
    const getNotesCountForDay = (date: Date): number => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, "0")
        const day = String(date.getDate()).padStart(2, "0")
        const dateKey = `${year}-${month}-${day}`
        return monthStatsMap.value.get(dateKey) || 0
    }

    const loadStatsAndSync = async () => {
        if (!technicalStore.isOnline) return
        try {
            technicalStore.setStatus('loading')
            const stats = await LocalDB.getMonthStats(currentDate.value)
            currentMonthStats.value = stats
            technicalStore.setStatus('success')
        } catch (error) {
            console.error("Ошибка при получении статистики файлов:", error)
            technicalStore.setStatus('error')
        }
    }

    // Функция открытия редактора - передаем fullDate как параметр
    const openNoteEditor = (notesModalId: string, fullDate: Date) => {
        const editorModalId = modalService.open(NewNoteModal, {
            selectedDate: fullDate, // ✅ теперь fullDate передан как параметр
            isEditing: false,
            note: null,
            onSaved: async (newNoteData: any) => {
                console.log('Заметка сохранена:', newNoteData)
        
                modalService.close(editorModalId)
                await loadStatsAndSync()
        
                modalService.close(notesModalId)
                const newModalId = modalService.open(NotesModalView, {
                    selectedDate: fullDate,
                    onClose: async () => {
                        modalService.close(newModalId)
                        await loadStatsAndSync()
                    },
                    onCreateNew: () => openNoteEditor(newModalId, fullDate) // ✅ передаем fullDate
                })
            },
            onClose: () => {
                modalService.close(editorModalId)
            }
        })
    }
  
    const handleDayClick = (fullDate: Date) => {
        const notesCount = getNotesCountForDay(fullDate)
    
        const notesModalId = modalService.open(NotesModalView, {
            selectedDate: fullDate,
            onClose: async () => {
                modalService.close(notesModalId)
                await loadStatsAndSync()
            },
            onCreateNew: () => openNoteEditor(notesModalId, fullDate) // ✅ передаем fullDate
        })
    
        if (!notesCount) {
            setTimeout(() => openNoteEditor(notesModalId, fullDate), 100) // ✅ передаем fullDate
        }
    }


    return {
      // === Состояние ===
      currentDate,
      currentMonthStats,
      
      // === Навигация ===
      days,
      prevMonth,
      nextMonth,
      onToday,
      onMonthSelect,
      openMonthPicker,
      
      // === Свайп ===
      onTouchStart,
      onTouchEnd,
      
      // === Локализация ===
      thisMonth,
      nameDays,
      
      // === Статистика ===
      monthStatsMap,
      getNotesCountForDay,
      loadStatsAndSync,
      
      // === Действия с заметками ===
      handleDayClick,
      openNoteEditor,
      
      // === Утилиты ===
      formatDateKey
    }
}