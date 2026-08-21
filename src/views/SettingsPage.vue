<template>
  <div class="settings-page">
    <header class="page-header">
      <h1>{{ t('Settings.title') }}</h1>
    </header>

    <div class="settings-container">
      <!-- Тема -->
      <div class="settings-card">
        <div class="card-header">
          <div class="icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          </div>
          <div class="card-content">
            <h3>{{ t('Settings.theme') }}</h3>
            <p>{{ t('Settings.themeDescription') }}</p>
          </div>
          <label class="switch">
            <input type="checkbox" v-model="isDarkMode" @change="toggleTheme">
            <span class="slider round"></span>
          </label>
        </div>
      </div>

      <!-- Авторизация -->
      <div class="settings-card">
        <div class="card-header">
          <div class="icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
              <polyline points="10 17 15 12 10 7"/>
              <line x1="15" y1="12" x2="3" y2="12"/>
            </svg>
          </div>
          <div class="card-content">
            <h3>{{ t('Settings.account') }}</h3>
            <p v-if="userEmail">{{ userEmail }}</p>
            <p v-else>{{ t('Settings.signedInAs') + ' ' + providerName }}</p>
          </div>
          <button class="logout-btn" @click="logout">
            {{ t('Settings.logout') }}
          </button>
        </div>
      </div>

      <!-- Версия приложения -->
      <div class="settings-card">
        <div class="card-header">
          <div class="icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div class="card-content">
            <h3>{{ t('Settings.version') }}</h3>
            <p>v1.0.0</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTechnicalStore } from '@/services/TechnicalStore';
import { AuthFactory } from '@/services/AuthFactory';
import { useAuthService } from '@/services/AuthService';

const { logout } = useAuthService()
const { t } = useI18n();
const technicalStore = useTechnicalStore();

// ==================== COMPUTED ====================
const providerName = computed(() => {
  const id = technicalStore.currentProviderId;
  console.log(id);
  if (!id || id === 'null' || id === 'undefined') {
    return t('Settings.localProfile', 'Локальный профиль');
  }
  const provider = AuthFactory.getProvider(id);
  return provider?.name || t('Settings.localProfile', 'Локальный профиль');
});

// ==================== STATE ====================
const isDarkMode = ref(false);
const userEmail = ref('');

// ==================== METHODS ====================
const toggleTheme = () => {
  if (isDarkMode.value) {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('theme', 'light');
  }
};

// ==================== LIFECYCLE ====================
onMounted(() => {
  // Настройка темы
  const savedTheme = localStorage.getItem('theme');
  
  if (savedTheme === 'dark') {
    isDarkMode.value = true;
    document.documentElement.setAttribute('data-theme', 'dark');
  } else if (savedTheme === 'light') {
    isDarkMode.value = false;
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    isDarkMode.value = prefersDark;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  }
  
  // Загружаем email пользователя
  const email = localStorage.getItem('user_email');
  if (email) {
    userEmail.value = email;
  }
});
</script>

<style scoped>
/* Центральный контейнер страницы */
.settings-page {
  max-width: 800px; /* Сузили до размера контейнера, чтобы всё выровнялось строго по центру */
  margin: 0 auto;
  min-height: 100vh;
  padding: 80px 20px 40px;
}

/* Заголовок страницы и его линия */
.page-header {
  display: flex;
  flex-direction: column;
  align-items: center; /* Центрируем заголовок и линию */
  justify-content: center;
  text-align: center;
  margin-bottom: 40px;
  width: 100%;
}

.page-header h1 {
  color: var(--heading-color);
  font-size: 2.25rem;
  font-weight: 700;
  letter-spacing: -0.5px;
  line-height: 1.2;
  margin: 2rem 0 0; /* Убрали нижний маргин, чтобы линия считалась ровно от текста */
  position: relative;
  display: inline-block;
}

/* Идеально отцентрованная линия-подчеркивание */
.page-header h1::after {
  content: '';
  display: block;
  width: 60px;
  height: 4px;
  background: linear-gradient(90deg, #3498db, #2ecc71);
  margin: 16px auto 0; /* Авто-отступы по бокам выравнивают её строго по центру h1 */
  border-radius: 2px;
}

/* Контейнер карточек настроек */
.settings-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
}

.settings-card {
  background: var(--card-bg, #1a1a2e);
  border-radius: 20px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  transition: all 0.3s ease;
}

.settings-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
}

/* ИСПРАВЛЕНО: Единая, монолитная сетка для ВСЕХ карточек (включая последнюю) */
.card-header {
  display: grid;
  grid-template-columns: 56px 1fr 56px; 
  align-items: center;
  gap: 20px;
  padding: 24px 28px;
  min-height: 96px;
  box-sizing: border-box;
}

/* Логотип / Иконка (Выровнена по левому краю) */
.icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(52, 152, 219, 0.06);
  border-radius: 14px;
  color: #3498db;
  justify-self: start; /* Прижимаем иконку строго влево */
}

/* Блок текста (Всегда прижат влево) */
.card-content {
  min-width: 0;
  text-align: center; /* Центрируем текст внутри блока */
  width: 100%;
}

.card-content h3 {
  margin: 0 0 6px 0;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--text-primary, #ffffff);
}

.card-content p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary, #a0a0a0);
  line-height: 1.4;
}

/* Тогл переключатель (Отцентрован строго внутри своей правой колонки 120px) */
.switch {
  justify-self: end; /* Прижимаем строго к правому краю */
  position: relative;
  display: inline-block;
  width: 52px;
  height: 28px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.3s;
  border-radius: 34px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 22px;
  width: 22px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .slider {
  background: var(--button-bg, linear-gradient(135deg, #3498db, #2ecc71));
}

input:checked + .slider:before {
  transform: translateX(24px);
}

/* Кнопка выхода (Отцентрована строго внутри правой колонки 120px, как и тогл) */
.logout-btn {
  justify-self: end; 
  /* ИСПРАВЛЕНО: Включаем флексбокс и центрируем текст внутри кнопки */
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 80px; 
  padding: 8px 12px;
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  box-sizing: border-box; 
}

.switch,
.logout-btn {
  flex-shrink: 0;   /* Запрещает кнопкам деформироваться */
}

.logout-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 5px 15px rgba(231, 76, 60, 0.3);
}

.logout-btn:active {
  transform: translateY(0);
}

/* ИСПРАВЛЕНО: Убраны ломающие структуру правила для последней карточки. 
   Она теперь подчиняется общему выравниванию, правая колонка просто остается пустой. */
.settings-card:last-child .card-header {
  grid-template-columns: 56px 1fr 56px;
}

/* Адаптивность под мобильные экраны (Capacitor Android) */
@media (max-width: 768px) {
  .settings-page {
    padding: 60px 16px 100px;
  }
  
  .page-header h1 {
    font-size: 1.875rem;
  }
  
  /* ИСПРАВЛЕНО: Сохраняем строго симметричную сетку 44px | 1fr | 44px и для мобилок */
  .card-header,
  .settings-card:last-child .card-header {
    grid-template-columns: 44px 1fr 44px;
    gap: 12px;
    padding: 16px;
    min-height: 76px;
  }
  
  .icon {
    width: 44px;
    height: 44px;
    border-radius: 10px;
  }
  
  .icon svg {
    width: 22px;
    height: 22px;
  }
  
  .card-content h3 {
    font-size: 1rem;
  }
  
  .card-content p {
    font-size: 0.8rem;
  }
  
  .switch {
    width: 44px;
    height: 24px;
  }
  
  .slider:before {
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
  }
  
  input:checked + .slider:before {
    transform: translateX(20px);
  }
  
  /* ИСПРАВЛЕНО: Кнопка на мобилке ужимается, чтобы влезть в отведенные правые 44px */
  .logout-btn {
    padding: 6px 8px;
    font-size: 0.75rem;
    max-width: 44px;
  }
}
</style>
