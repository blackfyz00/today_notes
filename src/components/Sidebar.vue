<template>
  <button 
    v-if="isMobile && !isMobileOpen" 
    class="mobile-menu-toggle"
    @click="toggleMobileMenu"
    aria-label="Open menu"
  >
    ☰
  </button>
  
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
      <h2 v-if="!isCollapsed || isMobile">{{ $t('Menu.name') }}</h2>
    </div>

    <nav class="sidebar-nav">
      <ul>
        <li v-for="item in menuItems" :key="item.name">
          <router-link 
            :to="item.link"
            class="menu-link"
            @click="onMenuItemClick"
          >
            <span class="icon">{{ item.icon }}</span>
            <span v-if="!isCollapsed || isMobile" class="label">{{ item.name }}</span>
          </router-link>
        </li>
      </ul>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const { t } = useI18n();

// Состояния
const isCollapsed = ref(true);
const isMobileOpen = ref(false);

// Определяем, мобильное ли устройство
const isMobile = computed(() => window.innerWidth <= 768);

// Меню с локализацией
const menuItems = computed(() => [
  { name: t('Menu.home'), icon: '🏠', link: '/' },
  { name: t('Menu.profile'), icon: '👤', link: '/profile' },
  { name: t('Menu.settings'), icon: '⚙️', link: '/settings' },
  { name: t('Menu.help'), icon: '❓', link: '/help' }
]);

// Открытие мобильного меню
const toggleMobileMenu = () => {
  isMobileOpen.value = true;
};

// Закрытие мобильного меню
const closeMobileMenu = () => {
  isMobileOpen.value = false;
};

// Переключение сайдбара (десктоп)
const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value;
};

// Универсальный обработчик кнопки в шапке сайдбара
const handleToggle = () => {
  if (isMobile.value) {
    closeMobileMenu();
  } else {
    toggleSidebar();
  }
};

// Закрываем мобильное меню при выборе пункта
const onMenuItemClick = () => {
  if (isMobile.value) {
    closeMobileMenu();
  }
};

// (Опционально) Обновляем isMobile при изменении размера окна
onMounted(() => {
  const handleResize = () => {
    // При переходе с десктопа на мобильный — закрываем сайдбар, если он был открыт
    if (window.innerWidth <= 768) {
      isMobileOpen.value = false;
    }
  };
  window.addEventListener('resize', handleResize);
  // Удаление слушателя не обязателен в простых случаях, но можно добавить onBeforeUnmount
});
</script>

<style scoped>
/* Используем ту же типографику и цвета */
.sidebar {
  width: 260px;
  background: #ffffff;
  color: #2c3e50;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1;
  transition: width 0.3s ease, transform 0.3s ease;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border-radius: 0 16px 16px 0;
  overflow: hidden;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
}

.sidebar.collapsed {
  width: 70px;
}

/* Мобильная версия: сайдбар скрыт за левым краем */
@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
    width: 260px; /* всегда полная ширина на мобилке */
    border-radius: 0;
    box-shadow: 0 0 24px rgba(0, 0, 0, 0.15);
  }

  .sidebar.collapsed {
    width: 260px; /* игнорируем collapsed-режим на мобилке */
  }

  /* Когда сайдбар открыт на мобилке */
  .sidebar.mobile-open {
    transform: translateX(0);
  }
}

.sidebar-header {
  padding: 20px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 2px solid transparent;
  background: linear-gradient(90deg, #3498db, #2ecc71);
  color: white;
}

.sidebar-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  letter-spacing: -0.3px;
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
}

.toggle-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.sidebar-nav ul {
  list-style: none;
  padding: 20px 0;
  margin: 0;
}

.sidebar-nav li {
  margin: 6px 16px;
}

.sidebar-nav a {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  color: #2c3e50;
  text-decoration: none;
  border-radius: 10px;
  transition: all 0.25s ease;
  font-weight: 500;
  font-size: 1rem;
}

.sidebar-nav a:hover {
  background-color: #f8fafc;
  color: #3498db;
  transform: translateX(4px);
}

.icon {
  margin-right: 14px;
  font-size: 1.2rem;
  min-width: 24px;
  text-align: center;
}

.label {
  white-space: nowrap;
  opacity: 0.95;
}

/* При свёрнутом состоянии — иконки по центру */
.sidebar.collapsed .sidebar-nav a {
  justify-content: center;
  padding: 14px;
}

.sidebar.collapsed .icon {
  margin-right: 0;
}

/* Оверлей для мобильного меню (добавьте его в родительский компонент или здесь через портал) */
.sidebar-overlay {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1;
  backdrop-filter: blur(2px);
}

/* Кнопка-гамбургер для мобильного меню */
.mobile-menu-toggle {
  display: none;
  position: fixed;
  top: 16px;
  left: 9vw;
  z-index: 1;
  width: 59px;
  height: 59px;
  background: linear-gradient(90deg, #3498db, #2ecc71);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 1.5rem;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.mobile-menu-toggle:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

@media (max-width: 768px) {
  .mobile-menu-toggle {
    margin: 7vw 0px;
    display: flex;
  }
  .sidebar-overlay.active {
    display: block;
  }
}
</style>