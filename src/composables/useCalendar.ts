// src/composables/useCalendarDates.ts
import { ref, computed } from 'vue'

export function useCalendarDates() {
  const currentDate = ref(new Date())

  // Форматируем дату в строку "YYYY-MM-DD"
  const formatDateKey = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
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

  return {
    currentDate,
    days,
    prevMonth,
    nextMonth,
    formatDateKey
  }
}