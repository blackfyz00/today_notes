<!-- src/views/Calendar.vue -->
<template>
  <LoadingOverlay :show="snapshot.matches('loading')" />
  <div class="main-calendar">
    <h1 @click="onToday">{{ t('Calendar.name') }}</h1>
    
    <!-- Кнопка быстрого создания -->
    <div class="mobile-menu-toggle" @click="openNotesForDay(new Date())">+</div>

    <div class="preHead">
      <div class="stdBtn" @click="prevMonth">←</div>
      <div class="CalendBtn" @click="openMonthPicker">
        {{ `${thisMonth} ${currentDate.getFullYear()}` }}
      </div>
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

        <!-- Индикатор наличия заметок -->
        <span 
          v-if="notesStore.stats && notesStore.stats[day.dateKey] > 0" 
          class="note-dot"
          :title="`${notesStore.stats[day.dateKey]} заметок`"
        ></span>
      </div>
    </div>

    <!-- Модалка выбора месяца -->
    <MonthPickerModal
      v-model="isMonthPickerOpen"
      :current-date="currentDate"
      @select="onMonthSelect"
    />

    <!-- Модальное окно списка заметок -->
    <NotesModalView
      v-model="isNotesOpen"
      :date="selectedDate"
      @create-editor="openNewNoteEditor" 
      @edit-note="handleEditNote"
    />

    <!-- Модальное окно редактора -->
    <NewNoteModal
      v-model="isNewNoteOpen"
      :is-editing="!!selectedNote" 
      :note="selectedNote"
      :selected-date="selectedDate"
      @update:model-value="(val) => { 
          isNewNoteOpen = val; 
          if (!val && selectedDate) {
            // Больше не нужно вызывать локальную fetchStats()
            notesStore.fetchStats(selectedDate);
          }
      }"
    />
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import { ref, computed, onMounted, watch } from 'vue'
import { useNotesStore } from '../components/notesStore.ts'
import { useCalendarDates as useCalendar } from '../composables/useCalendar'

import LoadingOverlay from '../components/loadingOverlay.vue'
import { useMachine } from '@xstate/vue';
import { loadingMachine } from '../composables/xstate';

// Компоненты
import NotesModalView from './NotesModalView.vue'
import MonthPickerModal from './MonthPickerModal.vue'
import NewNoteModal from './NewNoteModal.vue'

import { useCalendarModals } from '../composables/useCalendarModals'

const { currentDate, days, prevMonth, nextMonth  } = useCalendar()
const { snapshot, send } = useMachine(loadingMachine);
const {
  isNotesOpen,
  isNewNoteOpen,
  isMonthPickerOpen,
  selectedDate,
  selectedNote,
  openNotesForDay,
  openNewNoteEditor,
  handleEditNote,
  openMonthPicker,
} = useCalendarModals()

const { t } = useI18n()
const notesStore = useNotesStore()

// === Состояние UI ===
const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

const thisMonth = computed(() => {
  const monthIndex = currentDate.value.getMonth()
  return t(`Calendar.months.${monthKeys[monthIndex]}`)
})

const nameDays = computed(() => {
  return dayKeys.map(key => t(`Calendar.days.${key}`))
})

const onMonthSelect = (newDate) => {
  currentDate.value = newDate
  isMonthPickerOpen.value = false
}

const onToday = () => {
  currentDate.value = new Date()
}

const loadStats = async () => {
  send({ type: 'FETCH' }); 
  try {
    // Вызываем метод стора
    await notesStore.fetchStats();
    send({ type: 'SUCCESS' });
  } catch (err) {
    send({ type: 'ERROR' }); 
  }
};


onMounted(loadStats)

watch(currentDate, (newDate) => {
  if (newDate) {
    loadStats(); // Используем обертку с send()
  }
})

</script>

<style scoped>
.preHead {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 5px;
  margin: 0 12px 16px;
  padding: 5px;
  min-height: 48px;
  font-size: 1.125rem;
}

/* Заголовок календаря */
h1 {
  color: var(--heading-color);
  text-align: center;
  font-size: 2.25rem;
  font-weight: 700;
  letter-spacing: -0.5px;
  line-height: 1.2;
  margin: 2rem 0 1.25rem;
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

/* Кнопки навигации */
.stdBtn,
.CalendBtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0 6px;
  padding: 10px 16px;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.25s ease;
  user-select: none;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.stdBtn:hover,
.CalendBtn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
}

.CalendBtn {
  min-width: 140px;
  color: #3498db;
  background: var(--card-bg);
  border: 2px solid #3498db;
}

.CalendBtn:hover {
  background: rgba(52, 152, 219, 0.05);
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
  color: var(--text-primary);
  background: var(--bg-secondary);
  border-radius: 10px;
  user-select: none;
}

.CalendarBody {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 12px;
  padding: 24px;
  background: var(--card-bg);
  border-radius: 20px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.day-cell {
  display: flex;
  position: relative; 
  align-items: center;
  justify-content: center;
  height: 64px;
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--text-primary);
  background: var(--card-bg);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.25s ease;
  user-select: none;
  border: 1px solid transparent;
}

.day-cell:hover {
  transform: scale(1.03);
  transition: all 0.1s ease;
  cursor: pointer;
}

.day-cell:not(.today):hover {
  background: rgba(52, 152, 219, 0.08);
  border-color: rgba(52, 152, 219, 0.3);
}

.note-dot {
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 6px;
  height: 6px;
  background-color: #3b82f6;
  border-radius: 50%;
  pointer-events: none; /* Чтобы точка не мешала клику по дню */
}

/* Опционально: другой цвет для дней с заметками */
.day-cell.today .note-dot {
  background-color: #10b981;
}

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

/* Дни из других месяцев */
.other-month {
  color: var(--text-secondary);
  opacity: 0.7;
}

.other-month:hover {
  opacity: 1;
}

/* Выходные дни */
.weekend {
  color: #e74c3c; /* можно вынести в --color-danger, но оставим как акцент */
}

.weekend.other-month {
  color: #e07b7b;
}

.mobile-menu-toggle {
  display: none;
}

/* Адаптивность */
@media (max-width: 900px) {

  .main-calendar{
    margin-top: 3rem;
  }

  .mobile-menu-toggle {
    display: flex;
    position: fixed;
    top: 42px;
    right: 7vw;
    width: 60px;
    z-index: 1;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(90deg, #3498db, #2ecc71);
    color: white;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    align-items: center;
    justify-content: center;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .CalendarHead{
    grid-template-columns: repeat(7, minmax(4px, 1fr));
  }

  .CalendarBody {
    display: grid;
    grid-template-columns: repeat(7, 1fr); 
    gap: 14px; 
    padding: 16px;
    flex: 1;
  }

  .mobile-menu-toggle:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  }

  h1 {
    font-size: 1.875rem;
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
    height: 60px;
    font-size: 1.2rem;
    border-radius: 14px;
  }
}
</style>