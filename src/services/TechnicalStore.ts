// src/stores/technical.ts
import { Capacitor } from '@capacitor/core';
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export type TechnicalState = 'loading' | 'success' | 'no_network' | 'error';

export const useTechnicalStore = defineStore('technicalStore', () => {
  // ==================== STATE ====================
  const accessToken = ref<string | null>(localStorage.getItem('access_token'));
  const currentProviderId = ref<string | null>(localStorage.getItem('auth_provider_id'));
  const status = ref<TechnicalState>('success');
  // ==================== GETTERS ====================
  const isAuthorized = computed(() => accessToken.value !== null);
  const isOnline = computed(() => status.value !== 'no_network');
  const isMobile = ref(Capacitor.isNativePlatform());

  // ==================== ACTIONS ====================
  const setStatus = (newStatus: TechnicalState) => {
    status.value = newStatus;
  };

  const setAuth = (token: string, providerId: string) => {
    accessToken.value = token;
    currentProviderId.value = providerId;
    status.value = 'success';
    
    localStorage.setItem('access_token', token);
    localStorage.setItem('auth_provider_id', providerId);
  };

  const clearAuth = () => {
    accessToken.value = null;
    currentProviderId.value = null;
    status.value = 'success';
    
    localStorage.removeItem('access_token');
    localStorage.removeItem('token_expiry');
    localStorage.removeItem('auth_provider_id');
  };

  // ==================== RETURN ====================
  return {
    // State
    accessToken,
    currentProviderId,
    status,

    // Getters
    isAuthorized,
    isOnline,
    isMobile,
    
    // Actions
    setStatus,
    setAuth,
    clearAuth,
  };
});