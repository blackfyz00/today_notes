// src/composables/useNetwork.ts
import { ref, onMounted, onUnmounted } from 'vue';
import { useTechnicalStore } from '@/services/TechnicalStore';

export function useNetwork() {
  const technicalStore = useTechnicalStore();
  const isOnline = ref(navigator.onLine);

  const updateOnlineStatus = () => {
    isOnline.value = navigator.onLine;
    if (navigator.onLine) {
      if (technicalStore.status === 'no_network') {
        technicalStore.setStatus('success');
      }
    } else {
      technicalStore.setStatus('no_network');
    }
  };

  const startListening = () => {
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
  };

  const stopListening = () => {
    window.removeEventListener('online', updateOnlineStatus);
    window.removeEventListener('offline', updateOnlineStatus);
  };

  return {
    isOnline,
    updateOnlineStatus,
    startListening,
    stopListening,
  };
}