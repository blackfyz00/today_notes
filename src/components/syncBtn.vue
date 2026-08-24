<!-- src/components/SyncBtn.vue -->
<template>
  <button 
    class="sync-btn" 
    @click="handleClick"
    :disabled="isDisabled"
    :title="buttonTitle"
    aria-label="Синхронизировать"
  >
    <!-- Иконка облака с стрелкой -->
    <svg 
      v-if="!isSyncing" 
      xmlns="http://www.w3.org/2000/svg" 
      width="28" 
      height="28" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"/>
      <polyline points="12 15 9 12 12 9"/>
      <line x1="9" y1="12" x2="21" y2="12"/>
    </svg>
    
    <!-- Спиннер при загрузке -->
    <svg 
      v-else 
      class="spinner" 
      xmlns="http://www.w3.org/2000/svg" 
      width="28" 
      height="28" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      stroke-width="2"
    >
      <circle cx="12" cy="12" r="10" opacity="0.25"/>
      <path d="M12 2a10 10 0 0 1 10 10" opacity="1">
        <animateTransform 
          attributeName="transform" 
          type="rotate" 
          from="0 12 12" 
          to="360 12 12" 
          dur="1s" 
          repeatCount="indefinite"
        />
      </path>
    </svg>
    
    <!-- Бейдж с количеством -->
    <span class="sync-badge" v-if="pendingCount > 0">{{ pendingCount }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTechnicalStore } from '@/services/TechnicalStore';
import { useSyncStore } from '@/services/SyncStore';
import { modalService } from '@/services/ModalService';
import ReAuthModal from '@/views/ReauthModal.vue'; // ← Добавь правильный путь к твоему компоненту

const syncStore = useSyncStore();
const technicalStore = useTechnicalStore();

const props = defineProps<{
  fullSync?: boolean;
  syncingText?: string;
  month: string;  
  readyText?: string;
}>();

const isSyncing = computed(() => technicalStore.isSyncing);
const pendingCount = computed(() => syncStore.queueSize);
const isOnline = computed(() => technicalStore.isOnline);
const isAuthorized = computed(() => technicalStore.isAuthorized);

const isDisabled = computed(() => {
  return isSyncing.value || !isOnline.value || !isAuthorized.value;
});

const buttonTitle = computed(() => {
  if (isSyncing.value) return props.syncingText || 'Синхронизация...';
  if (!isOnline.value) return 'Нет подключения к интернету';
  if (!isAuthorized.value) return 'Необходимо авторизоваться';
  if (technicalStore.isTokenExpired) return 'Токен истёк, требуется повторная авторизация';
  if (pendingCount.value > 0) {
    return `${pendingCount.value} заметок ожидают синхронизации`;
  }
  return props.readyText || 'Синхронизировать с облаком';
});

const emit = defineEmits<{
  (e: 'sync-start'): void;
  (e: 'sync-end'): void;
  (e: 'error', error: Error): void;
}>();

const handleClick = async () => {
  if (isDisabled.value) return;
  
  // ✅ Проверяем токен ПЕРЕД синхронизацией
  if (technicalStore.isTokenExpired) {
    const modalId = modalService.open(ReAuthModal, {
      onReauthorized: async () => {
        // После успешной реавторизации — продолжаем синхронизацию
        modalService.close(modalId);
        await performSync();
      },
      onClose: () => {
        modalService.close(modalId);
      }
    });
    return; // Прерываем, ждём реавторизации
  }
  
  await performSync();
};

const performSync = async () => {
  try {
    emit('sync-start');
    
    // ✅ Сначала синхронизируем очередь
    await syncStore.processQueue();
    
    // ✅ Потом синхронизируем месяц
    await syncStore.syncMonth(props.month);
    
    emit('sync-end');
    console.log(`✅ Синхронизация ${props.month} завершена`);
    
  } catch (error) {
    console.error('❌ Ошибка синхронизации:', error);
    emit('error', error as Error);
    alert('Ошибка синхронизации. Проверьте подключение.');
  }
};
</script>
<style scoped>

.sync-btn {
  /* Позиционирование — зеркально кнопке меню (справа) */
  position: fixed !important;
  top: 42px !important;        /* Точно так же, как у меню */
  right: 7vw !important;       /* Зеркальный отступ справа */
  z-index: 2 !important;    /* Повышенный z-index, чтобы не перекрывалось */
  
  /* Размеры — точно как у меню */
  width: 56px !important;
  height: 56px !important;
  min-width: 56px !important;
  min-height: 56px !important;
  max-width: 56px !important;
  max-height: 56px !important;
  
  /* Идеально круглая форма */
  border-radius: 50% !important; 
  padding: 0 !important;
  box-sizing: border-box !important;
  
  /* Оформление один в один как у меню */
  background: linear-gradient(90deg, #3498db, #2ecc71) !important;
  color: white !important;
  border: none !important;
  cursor: pointer !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
  
  /* Центрирование иконки внутри */
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  
  /* Анимации и сброс стилей */
  transition: transform 0.2s ease, box-shadow 0.2s ease !important;
  line-height: 1 !important;
  outline: none !important;
  -webkit-tap-highlight-color: transparent;
}


.sync-btn:hover:not(:disabled) {
  transform: scale(1.1);
  box-shadow: 0 4px 20px rgba(52, 152, 219, 0.5);
}

.sync-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.sync-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: scale(0.95);
}

/* Иконки внутри кнопки */
.sync-btn svg {
  width: 28px;
  height: 28px;
  min-width: 28px;
  min-height: 28px;
  stroke: white;
  flex-shrink: 0;
  display: block;
  margin: 0;
}

/* Бейдж с количеством */
.sync-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background: #e74c3c;
  color: white;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
  min-width: 22px;
  height: 22px;
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--bg-primary, #1a1a2e);
  box-shadow: 0 2px 8px rgba(231, 76, 60, 0.4);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1;
  box-sizing: border-box;
}

/* Анимация спиннера */
.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Адаптивность — сохраняем круглую форму */
@media (max-width: 900px) {
  .sync-btn {
    width: 56px;
    height: 56px;
    min-width: 56px;
    min-height: 56px;
    max-width: 56px;
    max-height: 56px;
    top: 42px;
    right: 4vw;
  }
  
  .sync-btn svg {
    width: 28px;
    height: 28px;
    min-width: 28px;
    min-height: 28px;
  }
}

@media (max-width: 480px) {
  .sync-btn {
    width: 48px;
    height: 48px;
    min-width: 48px;
    min-height: 48px;
    max-width: 48px;
    max-height: 48px;
    top: 36px;
    right: 3vw;
  }
  
  .sync-btn svg {
    width: 24px;
    height: 24px;
    min-width: 24px;
    min-height: 24px;
  }
  
  .sync-badge {
    min-width: 18px;
    height: 18px;
    font-size: 9px;
    top: -5px;
    right: -5px;
    border-width: 1.5px;
  }
}
</style>