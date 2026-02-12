<template>
  <h1 @click="onToday">{{ t('Calendar.name') }}</h1>
  <div class="mobile-menu-toggle" @click="openNotesForDay(new Date())">+</div>

  <div class="preHead">
    <div class="stdBtn" @click="prevMonth">←</div>
    <div class="CalendBtn" @click="openMonthPicker">{{ thisMonth }}</div>
    <div class="stdBtn" @click="nextMonth">→</div>
  </div>

  <div class="CalendarHead">
    <span v-for="day in nameDays" :key="day">{{ day }}</span>
  </div>

  <div class="CalendarBody">
    <div
      v-for="(day, index) in days"
      :key="index"
      class="day-cell"
      :class="{
        'other-month': day.isOtherMonth,
        'today': day.isToday,
        'weekend': day.isWeekend
      }"
      @click="openNotesForDay(day.fullDate)"
    >
      {{ day.date }}
    </div>
  </div>

  <!-- Модалка выбора месяца -->
  <MonthPickerModal
    v-model="isMonthPickerOpen"
    :current-date="currentDate"
    @select="onMonthSelect"
  />

  <!-- Модальное окно заметок -->
  <NotesModalView
    v-model="isNotesOpen"
    :date="selectedDate"
    @create="handleCreate"
    @edit="handleEdit"
  />
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import NotesModalView from './NotesModalView.vue'
import MonthPickerModal from './MonthPickerModal.vue'

const { t } = useI18n()

// === Состояние модалки ===
const isNotesOpen = ref(false)
const isMonthPickerOpen = ref(false) 
const selectedDate = ref(new Date())

// === Календарь ===
const currentDate = ref(new Date())
const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

const thisMonth = computed(() => {
  const monthIndex = currentDate.value.getMonth()
  return t(`Calendar.months.${monthKeys[monthIndex]}`)
})

const nameDays = computed(() => {
  return dayKeys.map(key => t(`Calendar.days.${key}`))
})

// Генерация дней с полной датой
const days = computed(() => {
  const now = new Date()
  const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`

  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()

  const firstDay = new Date(year, month, 1).getDay()
  const startOffset = firstDay === 0 ? -6 : 1 - firstDay

  const result = []
  for (let i = 0; i < 42; i++) {
    const date = new Date(year, month, startOffset + i)
    const isCurrentMonth = date.getMonth() === month
    const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    const dayOfWeek = i % 7

    result.push({
      date: date.getDate(),
      isOtherMonth: !isCurrentMonth,
      isToday: dayKey === todayKey,
      isWeekend: dayOfWeek === 5 || dayOfWeek === 6,
      fullDate: date // ← сохраняем полную дату!
    })
  }
  return result
})

// === Обработка клика по дню ===
const openNotesForDay = (date) => {
  if (!date) return
  // Не открываем, если это "другой месяц" — опционально
  // if (date.getMonth() !== currentDate.value.getMonth()) return

  selectedDate.value = new Date(date) // важно: копия, чтобы не мутировать
  isNotesOpen.value = true
}

// === Навигация ===
const prevMonth = () => {
  const newDate = new Date(currentDate.value)
  newDate.setMonth(newDate.getMonth() - 1)
  currentDate.value = newDate
}

const nextMonth = () => {
  const newDate = new Date(currentDate.value)
  newDate.setMonth(newDate.getMonth() + 1)
  currentDate.value = newDate
}

const openMonthPicker = () => {
  isMonthPickerOpen.value = true
}

const onMonthSelect = (newDate) => {
  currentDate.value = newDate
}

const onToday = () => {
  currentDate.value = new Date()
}

// === Обработчики событий из модалки ===
const handleCreateNote = (note) => {
  console.log('Создать заметку:', note)
  // Здесь можно вызвать API или обновить данные
  isNotesOpen.value = false
}

const handleEditNote = (note) => {
  console.log('Редактировать заметку:', note)
  isNotesOpen.value = false
}
</script>


<style scoped>
.preHead {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin: 0 16px 24px;
  flex-wrap: nowrap; 
}
/* Заголовок календаря — чёткий, центрированный, с акцентом */
h1 {
  color: #2c3e50;
  text-align: center;
  font-size: 2.25rem; /* ~36px */
  font-weight: 700;
  letter-spacing: -0.5px;
  line-height: 1.2;
  margin: 2rem 0 1.25rem;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  position: relative;
}

h1::after {
  content: '';
  display: block;
  width: 60px;
  height: 4px;
  background: linear-gradient(90deg, #3498db, #2ecc71);
  margin: 16px auto 0;
  border-radius: 2px;
}

/* Кнопки навигации — аккуратные и интерактивные */
.stdBtn,
.CalendBtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0 6px;
  padding: 10px 16px;
  font-size: 1rem;
  font-weight: 600;
  color: #2c3e50;
  background: #f8f9fa;
  border: 1px solid #dde2e9;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.25s ease;
  user-select: none;
  font-family: 'Segoe UI', system-ui, sans-serif;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.stdBtn:hover,
.CalendBtn:hover {
  background: #edf2f7;
  border-color: #cbd5e0;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
}

.CalendBtn {
  min-width: 140px;
  font-weight: 600;
  color: #3498db;
  background: #ffffff;
  border: 2px solid #3498db;
}

.CalendBtn:hover {
  background: #f0f9ff;
  border-color: #2980b9;
  color: #2980b9;
}

/* Шапка календаря — дни недели */
.CalendarHead {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin: 24px 0 12px;
}

.CalendarHead span {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  font-weight: 700;
  font-size: 0.95rem;
  color: #2c3e50;
  background: #f1f5f9;
  border-radius: 10px;
  user-select: none;
  font-family: 'Segoe UI', system-ui, sans-serif;
}

.CalendarBody {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px; /* немного увеличили отступ между ячейками */
  padding: 12px; /* чуть больше внутреннего отступа */
  background: #ffffff;
  border-radius: 20px; /* чуть мягче при большем размере */
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08); /* чуть глубже тень */
}

.day-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 64px; /* было 48px → теперь 64px (на ~33% больше) */
  font-size: 1.3rem; /* было 1.1rem → теперь крупнее */
  font-weight: 600; /* чуть жирнее для лучшей читаемости */
  color: #2c3e50;
  background: #ffffff;
  border-radius: 16px; /* было 12px → пропорционально увеличено */
  cursor: pointer;
  transition: all 0.25s ease;
  user-select: none;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  border: 1px solid transparent;
}

.day-cell:hover {
  background: #f0f9ff;
  border-color: #bbe2ff;
  transform: scale(1.03);
}

/* Дни из других месяцев */
.other-month {
  color: #a0aec0;
  opacity: 0.7;
}

.other-month:hover {
  background: #f8fafc;
  opacity: 1;
}

/* Сегодняшний день */
.today {
  background: linear-gradient(135deg, #3498db, #2ecc71);
  color: white;
  font-weight: 700;
  box-shadow: 0 4px 10px rgba(52, 152, 219, 0.3);
}

.today:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 14px rgba(52, 152, 219, 0.4);
}

/* Выходные дни */
.weekend {
  color: #e74c3c;
  font-weight: 600;
}

.weekend.other-month {
  color: #e07b7b;
}

.mobile-menu-toggle{
  display: none
}

/* Адаптивность */
@media (max-width: 900px) {

  .mobile-menu-toggle {
  display: flex;
  position: fixed;
  top: 35px;
  right: 7vw;
  z-index: 101;
  width: 65px;
  height: 65px;
  border-radius: 50%; 

  background: linear-gradient(90deg, #3498db, #2ecc71);
  color: white;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);

  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .mobile-menu-toggle:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  }

  h1 {
    font-size: 1.875rem; /* ~30px */
    margin-top: 1.5rem;
  }

  .stdBtn,
  .CalendBtn {
    padding: 8px clamp(12px, 4vw, 24px);
    font-size: 0.95rem;
  }

  .CalendBtn {
    min-width: 110px;
  }

  .CalendarHead span {
    height: 36px;
    font-size: 0.875rem;
  }

  .day-cell {
    height: 42px;
    font-size: 1rem;
  }
}
</style>