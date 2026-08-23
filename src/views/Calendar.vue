<!-- src/views/Calendar.vue -->
<template>
<div class="main-calendar" @touchstart="onTouchStart" @touchend="onTouchEnd">
    <h1 @click="onToday">{{ t('Calendar.name') }}</h1>
    
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
        @click="handleDayClick(day.fullDate)"
        >
            {{ day.date }}

            <span 
            v-if="(monthStatsMap.get(day.dateKey) ?? 0) > 0" 
            class="note-dot"
            :title="`${monthStatsMap.get(day.dateKey) ?? 0} заметок`"
            ></span>
        </div>
    </div>
</div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { watch } from 'vue'
import { useCalendarDates as useCalendar } from '@/composables/useCalendar'

const { t } = useI18n()
const {
    currentDate,
    days,
    prevMonth,
    nextMonth,
    onToday,
    onTouchStart,
    onTouchEnd,
    openMonthPicker,
    monthStatsMap,
    getNotesCountForDay,
    loadStatsAndSync,
    formatDateKey,
    thisMonth,
    nameDays,
    handleDayClick
} = useCalendar()

watch(
    () => currentDate.value,
    (newDate, oldDate) => {
        if (!newDate) return
        
        if (oldDate) {
            const isSameMonth = newDate.getMonth() === oldDate.getMonth() && 
                newDate.getFullYear() === oldDate.getFullYear()
            if (isSameMonth) return
        }
        
        loadStatsAndSync()
    },
    { immediate: true }
)

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

.sync-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    max-width: 280px;
    margin: 10px auto;
    padding: 12px 24px;
    font-family: inherit;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.3px;
    color: white;
    background: var(--button-bg); /* Использует ваш красивый сине-зеленый градиент */
    border: none;
    border-radius: 10px;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(46, 204, 113, 0.25);
    transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
    touch-action: manipulation; /* Исключает 300мс задержку клика на Android */
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
    bottom: 6px; /* Чуть выше от нижнего края */
    left: 50%;
    transform: translateX(-50%);
    width: 8px; 
    height: 8px;
    background-color: #3b82f6 !important; /* Добавим !important на всякий случай */
    border-radius: 50%;
    pointer-events: none;
    z-index: 2; 
    display: block !important; /* Гарантируем отображение */
    box-shadow: 0 0 4px rgba(59, 130, 246, 0.5); /* Лёгкое свечение */
}

/* Опционально: другой цвет для дней с заметками */
.day-cell.today .note-dot {
    background-color: #10b981;
}

.today {
    background: var(--card-bg);
    color: var(--text-primary);
    font-weight: 700;
    border-radius: 14px;
    box-shadow: 0 0 0 4px #3498db;
}

.today:hover {
    transform: scale(1.05);
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

/* Адаптивность */
@media (max-width: 900px) {

    .main-calendar{
        margin-top: 3rem;
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