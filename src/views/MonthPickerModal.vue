<!-- src/components/MonthPickerModal.vue -->
<template>
  <Teleport to="body">
    <div v-if="modelValue" class="month-picker-overlay" @click="$emit('update:modelValue', false)">
      <div class="month-picker-content" @click.stop>
        <div class="month-picker-header">
          <h3>{{ currentYear }}</h3>
        </div>

        <div class="months-grid">
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

        <div class="month-picker-footer">
          <button class="cancel-btn" @click="$emit('update:modelValue', false)">
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

// Состояние
const currentYear = ref(props.currentDate.getFullYear())

// Обновляем год при изменении внешней даты
watch(() => props.currentDate, (newDate) => {
  currentYear.value = newDate.getFullYear()
})

// Месяцы на русском (или другом языке)
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

const prevYear = () => currentYear.value--
const nextYear = () => currentYear.value++
</script>

<style scoped>
.month-picker-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.month-picker-content {
  background: #ffffff;
  border-radius: 16px;
  width: 90%;
  max-width: 320px;
  padding: 1.5rem;
  color: #2c3e50;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
}

.month-picker-header {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.month-picker-header h3 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #2c3e50;
  letter-spacing: -0.5px;
  position: relative;
}

.month-picker-header h3::after {
  content: '';
  display: block;
  width: 40px;
  height: 3px;
  background: linear-gradient(90deg, #3498db, #2ecc71);
  margin: 8px auto 0;
  border-radius: 2px;
}

.months-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.month-btn {
  padding: 0.6rem 0.2rem;
  background: #f8f9fa;
  border: 1px solid #e0e6ed;
  border-radius: 10px;
  color: #34495e;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s ease;
}

.month-btn:hover {
  background: #edf7ff;
  color: #3498db;
  border-color: #b3d9f3;
}

.month-btn.active {
  background: #e6f4ff;
  color: #3498db;
  border-color: #3498db;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(52, 152, 219, 0.15);
}

.month-picker-footer {
  text-align: center;
}

.cancel-btn {
  background: none;
  border: none;
  color: #7f8c8d;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0.5rem 1rem;
  transition: color 0.2s;
}

.cancel-btn:hover {
  color: #2c3e50;
}
</style>    