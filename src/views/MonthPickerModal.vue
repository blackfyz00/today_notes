<!-- src/components/MonthPickerModal.vue -->
<template>
  <Teleport to="body">
    <div v-if="modelValue" class="month-picker-overlay" @click="$emit('update:modelValue', false)">
      <div class="month-picker-content" @click.stop>

        <!-- Выбор месяца -->
        <div v-if="!isYearPickerOpen" class="month-picker-header">
          <button class="year-display-btn" @click="openYearPicker">
            {{ currentYear }}
          </button>
        </div>

        <!-- Выбор года -->
        <div v-else class="year-picker-header">
          <button class="year-nav-btn" @click="prevDecade">←</button>
          <span class="year-range">{{ decadeStart }}–{{ decadeStart + 11 }}</span>
          <button class="year-nav-btn" @click="nextDecade">→</button>
        </div>

        <!-- Сетка месяцев или лет -->
        <div v-if="!isYearPickerOpen" class="months-grid">
          <button
            v-for="(month, index) in months"
            :key="index"
            class="month-btn"
            :class="{ active: isActive(index) }"
            @click="selectMonth(index)"
          >
            {{ month }}
          </button>
        </div>

        <div v-else class="years-grid">
          <button
            v-for="year in yearsInDecade"
            :key="year"
            class="year-btn"
            :class="{ active: year === props.currentDate.getFullYear() }"
            @click="selectYear(year)"
          >
            {{ year }}
          </button>
        </div>

        <div class="month-picker-footer">
          <button
            v-if="isYearPickerOpen"
            class="back-btn"
            @click="isYearPickerOpen = false"
          >
            ← Назад к месяцам
          </button>
          <button
            v-else
            class="cancel-btn"
            @click="$emit('update:modelValue', false)"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  modelValue: Boolean,
  currentDate: { type: Date, required: true }
})

const emit = defineEmits(['update:modelValue', 'select'])

// === Состояния ===
const currentYear = ref(props.currentDate.getFullYear())
const isYearPickerOpen = ref(false)
const decadeStart = ref(Math.floor(currentYear.value / 12) * 12) // 12-летние блоки

// Обновляем при изменении внешней даты
watch(() => props.currentDate, (newDate) => {
  currentYear.value = newDate.getFullYear()
  if (!isYearPickerOpen.value) {
    decadeStart.value = Math.floor(newDate.getFullYear() / 12) * 12
  }
})

// Месяцы
const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const months = computed(() => {
  return monthKeys.map(key => t(`Calendar.months.${key}`))
})

const isActive = (monthIndex) => {
  return (
    monthIndex === props.currentDate.getMonth() &&
    currentYear.value === props.currentDate.getFullYear()
  )
}

const selectMonth = (monthIndex) => {
  const selectedDate = new Date(currentYear.value, monthIndex, 1)
  emit('select', selectedDate)
  emit('update:modelValue', false)
}

// === Годы ===
const yearsInDecade = computed(() => {
  return Array.from({ length: 12 }, (_, i) => decadeStart.value + i)
})

const openYearPicker = () => {
  decadeStart.value = Math.floor(currentYear.value / 12) * 12
  isYearPickerOpen.value = true
}

const prevDecade = () => {
  decadeStart.value -= 12
}

const nextDecade = () => {
  decadeStart.value += 12
}

const selectYear = (year) => {
  currentYear.value = year
  isYearPickerOpen.value = false
}
</script>

<style scoped>
/* === Общие стили модалки === */
.month-picker-overlay {
  backdrop-filter: blur(4px);
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3;
}

.month-picker-content {
  background: var(--card-bg);
  border-radius: 16px;
  width: 90%;
  max-width: 320px;
  padding: 1.5rem;
  color: var(--text-primary);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
}

/* === Заголовки === */
.month-picker-header,
.year-picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 12px;
  min-height: 2.5rem;
}

/* Кнопка года (в режиме выбора месяца) - ЦЕНТРИРОВАНА И КРУПНЫЙ ШРИФТ */
.month-picker-header {
  justify-content: center; /* Центрируем кнопку года */
  padding: 0.5rem 0;
}

.year-display-btn {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  font-size: 2.25rem; /* Увеличенный шрифт */
  font-weight: 800;
  line-height: 1.1;
  color: var(--heading-color);
  background: transparent;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  user-select: none;
  transition: all 0.25s ease;
  position: relative;
  letter-spacing: -0.5px;
}

.year-display-btn:hover {
  background: var(--bg-secondary);
  transform: scale(1.03);
}

/* Градиентная линия под кнопкой года - улучшенная */
.year-display-btn::after {
  content: '';
  position: absolute;
  bottom: -8px;
  width: 60%;
  height: 4px;
  background: linear-gradient(90deg, #3498db, #2ecc71, #3498db);
  border-radius: 2px;
  opacity: 0.9;
}

/* === Заголовок выбора года === */
.year-picker-header {
  padding: 0.75rem 0;
}

/* Увеличенные кнопки навигации десятилетий */
.year-nav-btn {
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  width: 56px; /* Увеличена ширина */
  height: 56px; /* Увеличена высота */
  font-size: 1.75rem; /* Крупный шрифт для стрелок */
  font-weight: 700;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.25s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.year-nav-btn:hover {
  background: var(--bg-tertiary);
  border-color: var(--primary-color, #3498db);
  color: var(--primary-color, #3498db);
  transform: scale(1.05);
}

.year-nav-btn:active {
  transform: scale(0.95);
}

/* Диапазон лет - увеличенный шрифт */
.year-range {
  font-size: 1.65rem; /* Увеличенный шрифт */
  font-weight: 800;
  color: var(--heading-color);
  letter-spacing: -0.5px;
  text-align: center;
  flex-grow: 1;
  padding: 0 8px;
  line-height: 1.2;
}

/* === Сетки === */
.months-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.years-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

/* === Кнопки месяцев и лет === */
.month-btn,
.year-btn {
  padding: 0.6rem 0.2rem;
  background: var(--bg-secondary);
  border: 1px solid var(--input-border);
  border-radius: 10px;
  color: var(--text-secondary);
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s ease;
}

.month-btn:hover,
.year-btn:hover {
  background: rgba(52, 152, 219, 0.08);
  color: #3498db;
  border-color: rgba(52, 152, 219, 0.3);
}

.month-btn.active,
.year-btn.active {
  background: rgba(52, 152, 219, 0.15);
  color: #3498db;
  border-color: #3498db;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(52, 152, 219, 0.15);
}

/* === Футер === */
.month-picker-footer {
  text-align: center;
  margin-top: 0.5rem;
}

.cancel-btn,
.back-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0.5rem 1rem;
  transition: color 0.2s;
}

.cancel-btn:hover,
.back-btn:hover {
  color: var(--text-primary);
}
</style>