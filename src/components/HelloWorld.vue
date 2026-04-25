<template>
  <div class="wp8-calendar">
    <!-- Panorama Header с эффектом ухода за экран -->
    <header class="panorama-header">
      <h1 class="panorama-title">календарьзаметок</h1>
    </header>

    <div class="content">
      <!-- Навигация по месяцам -->
      <nav class="month-nav">
        <button class="nav-btn prev">←</button>
        
        <div class="current-month">
          <span class="month-name">СЕНТЯБРЬ</span>
          <span class="year">2023</span>
        </div>

        <button class="nav-btn next">→</button>
      </nav>

      <!-- Дни недели -->
      <div class="weekdays">
        <span>пн</span><span>вт</span><span>ср</span><span>чт</span><span>пт</span><span>сб</span><span>вс</span>
      </div>

      <!-- Календарная сетка -->
      <div class="calendar-grid">
        <div class="day other-month">28</div>
        <div class="day other-month">29</div>
        <div class="day other-month">30</div>
        <div class="day other-month">31</div>

        <div class="day">1</div>
        <div class="day">2</div>
        <div class="day weekend">3</div>
        <div class="day">4</div>

        <div class="day today">
          5
          <div class="live-dot"></div>
        </div>

        <div class="day">6</div>
        <div class="day">7</div>

        <div class="day">
          8
          <div class="note-bar"></div>
        </div>

        <!-- Добавляй остальные дни через v-for в реальном проекте -->
      </div>
    </div>

    <!-- FAB кнопка в стиле WP8 -->
    <button class="fab">
      <span class="plus">+</span>
    </button>
  </div>
</template>

<script setup>
// логика календаря
</script>

<style scoped>
.wp8-calendar {
  background: #000;
  min-height: 100vh;
  color: #fff;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  overflow: hidden; /* важно для эффекта обрезания */
}

/* ====================== PANORAMA — ТЕКСТ ЗА ПРЕДЕЛАМИ ЭКРАНА ====================== */
.panorama-header {
  padding: 32px 20px 12px;
  overflow: hidden;           /* обрезает текст, который уходит вправо */
  margin-bottom: 10px;
}

.panorama-title {
  font-size: clamp(4.2rem, 18vw, 8.5rem);   /* очень большой */
  font-weight: 100;                         /* максимально тонкий */
  letter-spacing: -5px;
  line-height: 0.78;
  text-transform: lowercase;
  white-space: nowrap;                      /* не переносим строку */
  margin: 0 0 0 -18px;                      /* главный трюк — уходит влево */
  padding-right: 80px;                      /* даём место для ухода вправо */
  opacity: 0.92;
  user-select: none;
}

/* ====================== ОСТАЛЬНОЕ (оставлено в духе WP8) ====================== */
.month-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px 16px;
}

.nav-btn {
  background: none;
  border: none;
  color: #0078d7;
  font-size: 2.4rem;
  width: 54px;
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.current-month {
  text-align: center;
}

.month-name {
  font-size: 1.5rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.year {
  font-size: 1.15rem;
  color: #777;
}

.weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  padding: 0 16px 8px;
}

.weekdays span {
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  color: #777;
  text-align: center;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 5px;
  padding: 0 16px;
}

.day {
  aspect-ratio: 1 / 1;
  background: #1f1f1f;
  color: #ddd;
  font-size: 1.5rem;
  font-weight: 300;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 10px 12px;
  position: relative;
  transition: all 0.12s ease;
}

.day:active {
  background: #333;
  transform: scale(0.95);
}

.day.other-month {
  opacity: 0.28;
  color: #666;
}

.day.weekend {
  color: #ff6a00;
}

.day.today {
  background: #0078d7 !important;
  color: #fff;
  font-weight: 600;
}

.live-dot {
  position: absolute;
  bottom: 12px;
  left: 14px;
  width: 7px;
  height: 7px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 0 10px #fff;
}

.note-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 6px;
  background: rgba(255, 255, 255, 0.8);
}

.fab {
  position: fixed;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  width: 70px;
  height: 70px;
  background: #000;
  border: 3px solid #fff;
  color: #fff;
  font-size: 38px;
  font-weight: 200;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 25px rgba(0, 120, 215, 0.35);
  z-index: 100;
}

.fab:active {
  transform: translateX(-50%) scale(0.9);
  background: #0078d7;
}

/* Мобильная адаптация */
@media (max-width: 480px) {
  .panorama-title {
    font-size: 5.2rem;
    margin-left: -22px;
    letter-spacing: -4px;
  }
}
</style>