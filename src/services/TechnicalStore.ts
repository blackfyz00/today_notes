// src/stores/technical.ts
import { Capacitor } from '@capacitor/core';
import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { modalService } from '@/services/ModalService';
import ReauthModal from '@/views/ReauthModal.vue';

export type TechnicalState = 'loading' | 'success' | 'no_network' | 'error';

export const useTechnicalStore = defineStore('technicalStore', () => {
  // ==================== STATE ====================
  const accessToken = ref<string | null>(localStorage.getItem('access_token'));
  const currentProviderId = ref<string | null>(localStorage.getItem('auth_provider_id'));
  const tokenExpiry = ref<string | null>(localStorage.getItem('token_expiry')); // ✅ ТОЛЬКО ЭТО
  const status = ref<TechnicalState>('success');
  
  const isReauthRequired = ref(false);
  const isSyncing = ref(false);
  const isMobile = ref(Capacitor.isNativePlatform());

  // ==================== GETTERS ====================
  const isAuthorized = computed(() => accessToken.value !== null);
  const isOnline = computed(() => status.value !== 'no_network');

  // ✅ Проверка истек ли токен (ПРОСТО)
  const isTokenExpired = computed(() => {
    if (!accessToken.value) return true;
    if (!tokenExpiry.value) return true;
    return Date.now() >= parseInt(tokenExpiry.value);
  });

  // ✅ Время до истечения (в секундах)
  const tokenTimeLeft = computed(() => {
    if (!accessToken.value || !tokenExpiry.value) return 0;
    return Math.max(0, Math.floor((parseInt(tokenExpiry.value) - Date.now()) / 1000));
  });

  // ✅ Нужна ли переавторизация (осталось < 10 минут)
  const needsReauth = computed(() => {
    if (!isAuthorized.value) return false;
    if (isTokenExpired.value) return true;
    return tokenTimeLeft.value <= 600; // 10 минут
  });

  // ==================== ACTIONS ====================
  const setStatus = (newStatus: TechnicalState) => {
    status.value = newStatus;
  };

  // ✅ Сохраняем токен (ПРОСТО)
  const setAuth = (token: string, providerId: string, expiresIn?: number) => {
    accessToken.value = token;
    currentProviderId.value = providerId;
    status.value = 'success';
    isReauthRequired.value = false;
    
    // ✅ Сохраняем время истечения
    const expiry = Date.now() + (expiresIn || 3600) * 1000;
    tokenExpiry.value = String(expiry);
    localStorage.setItem('token_expiry', String(expiry));
    localStorage.setItem('access_token', token);
    localStorage.setItem('auth_provider_id', providerId);
    
    console.log(`🔑 Токен действителен до: ${new Date(expiry).toLocaleString()}`);
  };

  const clearAuth = () => {
    accessToken.value = null;
    currentProviderId.value = null;
    tokenExpiry.value = null;
    status.value = 'success';
    isReauthRequired.value = false;
    isSyncing.value = false;
    
    localStorage.removeItem('access_token');
    localStorage.removeItem('token_expiry');
    localStorage.removeItem('auth_provider_id');
  };

  // ✅ Открывает модалку переавторизации
  const showReauthModal = () => {
    if (isReauthRequired.value) return;
    
    console.log('🔑 Открываем модалку переавторизации');
    isReauthRequired.value = true;
    
    const modalId = modalService.open(ReauthModal, {
      providerId: currentProviderId.value,
      onSuccess: (newToken: string) => {
        console.log('✅ Переавторизация успешна');
        setAuth(newToken, currentProviderId.value!);
        modalService.close(modalId);
      },
      onClose: () => {
        console.log('❌ Переавторизация отменена');
        isReauthRequired.value = false;
        modalService.close(modalId);
      }
    });
  };

  // ✅ Планирует переавторизацию (ждет завершения синхронизации)
  const checkAndScheduleReauth = () => {
    if (!isAuthorized.value) return;
    if (!needsReauth.value) return;
    if (isReauthRequired.value) return;
    
    console.log(`⏰ Токен истекает через ${tokenTimeLeft.value} сек, планируем переавторизацию...`);
    
    if (isSyncing.value) {
      console.log('⏳ Идет синхронизация, ждем завершения...');
      return;
    }
    
    showReauthModal();
  };

  // ✅ Для синхронизации
  const canSync = (): boolean => {
    if (isReauthRequired.value) {
      console.log('⛔ Синхронизация заблокирована — требуется переавторизация');
      return false;
    }
    return true;
  };

  const startSync = () => {
    isSyncing.value = true;
    console.log('🔄 Синхронизация началась');
  };

  const finishSync = () => {
    isSyncing.value = false;
    console.log('✅ Синхронизация завершена');
    
    if (needsReauth.value) {
      console.log('⏰ Токен истек во время синхронизации, открываем модалку');
      showReauthModal();
    }
  };

  // ✅ Для API-запросов: возвращает валидный токен
  const getValidToken = async (): Promise<string | null> => {
    if (!isAuthorized.value) {
      console.log('🔑 Нет токена');
      return null;
    }
    
    if (isTokenExpired.value) {
      console.log('⏰ Токен истек, открываем модалку');
      
      if (!isReauthRequired.value) {
        showReauthModal();
      }
      
      // Ждем пока модалка закроется
      return new Promise((resolve) => {
        const unwatch = watch(isReauthRequired, (val) => {
          if (!val) {
            unwatch();
            resolve(accessToken.value);
          }
        });
      });
    }
    
    return accessToken.value;
  };

  // ✅ Периодическая проверка
  let checkInterval: ReturnType<typeof setInterval> | null = null;

  const startTokenCheck = (intervalMs: number = 300000) => {
    if (checkInterval) return;
    
    checkInterval = setInterval(() => {
      checkAndScheduleReauth();
    }, intervalMs);
    
    console.log(`🔄 Периодическая проверка токена запущена (интервал: ${intervalMs}мс)`);
  };

  const stopTokenCheck = () => {
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
      console.log('🔄 Периодическая проверка токена остановлена');
    }
  };

  // ==================== RETURN ====================
  return {
    accessToken,
    currentProviderId,
    tokenExpiry,
    status,
    isReauthRequired,
    isSyncing,
    isAuthorized,
    isOnline,
    isMobile,
    isTokenExpired,
    tokenTimeLeft,
    needsReauth,
    setStatus,
    setAuth,
    clearAuth,
    showReauthModal,
    checkAndScheduleReauth,
    canSync,
    startSync,
    finishSync,
    getValidToken,
    startTokenCheck,
    stopTokenCheck,
  };
});