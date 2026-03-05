<template>
  <div 
    v-if="isMenuOpen" 
    class="sidebar-overlay" 
    @click="closeMenu"
  ></div>
  
  <button 
    v-if="isMobile && !isMobileOpen" 
    class="mobile-menu-toggle"
    @click="toggleMobileMenu"
    aria-label="Open menu"
  >
    ☰
  </button>
  
  <!-- САЙДБАР -->
  <div 
    class="sidebar" 
    :class="{ 
      'collapsed': !isMobile && isCollapsed,
      'mobile-open': isMobile && isMobileOpen 
    }"
  >
    <div class="sidebar-header">
      <button @click="handleToggle" class="toggle-btn">
        {{ isMobile ? '✕' : (isCollapsed ? '☰' : '✕') }}
      </button>
      <!-- Заголовок скрываем, если на десктопе свернуто -->
      <h2 v-if="isMenuOpen">{{ $t('Menu.name') }}</h2>
    </div>

    <nav class="sidebar-nav">
      <ul>
        <li v-for="item in menuItems" :key="item.name">
          <router-link 
            :to="item.link"
            class="menu-link"
            @click="onMenuItemClick"
          >
            <span class="icon">
              <img v-if="item.icon.includes('http')" :src="item.icon" class="icon-img" alt="" />
              <template v-else>{{ item.icon }}</template>
            </span>
            <span v-if="isMenuOpen" class="label">{{ item.name }}</span>
          </router-link>
        </li>
      </ul>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

const router = useRouter();
const { t } = useI18n();

const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024);
const isMobile = computed(() => windowWidth.value <= 768);

const isCollapsed = ref(true);   // Десктоп: true = свернут (узкий), false = развернут
const isMobileOpen = ref(false); // Мобайл: true = открыт, false = скрыт

const isMenuOpen = computed(() => {
  return isMobile.value ? isMobileOpen.value : !isCollapsed.value;
});

// Меню с локализацией
const menuItems = computed(() => [
  { name: t('Menu.home'), icon: '🏠', link: '/' },
  { name: t('Menu.profile'), icon: '👤', link: '/profile' },
  { name: t('Menu.settings'), icon: '⚙️', link: '/settings' },
  { name: t('Menu.login'), icon: '📝', link: '/auth' }
]);

const closeMenu = () => {
  if (isMobile.value) {
    isMobileOpen.value = false;
  } else {
    isCollapsed.value = true;
  }
};

const toggleMobileMenu = () => {
  isMobileOpen.value = true;
};

const handleToggle = () => {
  if (isMobile.value) {
    closeMenu();
  } else {
    isCollapsed.value = !isCollapsed.value;
  }
};

const onMenuItemClick = () => {
  closeMenu();
};

// --- Жизненный цикл ---
onMounted(() => {
  const handleResize = () => {
    windowWidth.value = window.innerWidth;
    if (!isMobile.value) {
      isMobileOpen.value = false;
    }
  };
  
  window.addEventListener('resize', handleResize);
});
</script>

<style scoped>
/* Базовые стили сайдбара */
.sidebar {
  width: 260px;
  background: var(--bg-primary, #ffffff);
  color: var(--text-primary, #333);
  border-right: 1px solid var(--border-color, #e0e0e0);
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 50; /* Повысили z-index */
  transition: width 0.3s ease, transform 0.3s ease;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border-radius: 0 16px 16px 0;
  overflow: hidden;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
}

/* Стили оверлея */
.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 40; /* Ниже сайдбара, но выше контента */
  cursor: pointer;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Состояние: Свернутый (Десктоп) */
.sidebar.collapsed {
  width: 70px;
  border-radius: 0 12px 12px 0;
}

/* Мобильная адаптация */
@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%); /* Скрыт за экраном */
    width: 260px;
    border-radius: 0;
    box-shadow: 0 0 24px rgba(0, 0, 0, 0.2);
  }

  .sidebar.collapsed {
    /* Игнорируем collapsed на мобильном, ширина всегда полная */
    width: 260px; 
  }

  .sidebar.mobile-open {
    transform: translateX(0); /* Выезжает */
  }
}

/* Хедер */
.sidebar-header {
  padding: 20px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(90deg, #3498db, #2ecc71);
  color: white;
  min-height: 30px;
}

.sidebar-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toggle-btn {
  background: none;
  border: none;
  color: white;
  font-size: 1.4rem;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: background 0.2s;
  flex-shrink: 0;
}

.toggle-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Навигация */
.sidebar-nav ul {
  list-style: none;
  padding: 20px 0;
  margin: 0;
}

.sidebar-nav li {
  margin: 6px 12px;
}

.menu-link {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  text-decoration: none;
  border-radius: 10px;
  transition: all 0.25s ease;
  font-weight: 500;
  font-size: 1rem;
  color: var(--text-primary, #333);
  cursor: pointer;
}

.menu-link:hover {
  background-color: var(--bg-secondary, #f5f5f5);
  color: #3498db;
}

.icon {
  margin-right: 14px;
  font-size: 1.2rem;
  min-width: 24px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-img {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.label {
  white-space: nowrap;
  opacity: 0.95;
  transition: opacity 0.2s;
}

.sidebar.collapsed .sidebar-nav a {
  justify-content: center;
  padding: 14px 0;
}

.sidebar.collapsed .icon {
  margin-right: 0;
}

.sidebar.collapsed .label {
  display: none; /* Скрываем текст */
}

.sidebar.collapsed .sidebar-header h2 {
  display: none;
}

.sidebar.collapsed .sidebar-header {
  justify-content: center;
}

/* Кнопка гамбургер */
.mobile-menu-toggle {
  display: none; /* Скрыта на десктопе по умолчанию */
  position: fixed;
  z-index: 1;
  background: linear-gradient(90deg, #3498db, #2ecc71);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.5rem;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
}

.mobile-menu-toggle:hover {
  transform: scale(1.05);
}

@media (max-width: 768px) {
  .mobile-menu-toggle {
    display: flex;
    top: 64px;
    position: fixed;
    left: 7vw;
    width: 60px;
    height: 60px;
    z-index: 1;
  }
}
</style>