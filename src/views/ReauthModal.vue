<!-- src/components/ReauthModal.vue -->
<template>
  <div class="reauth-overlay" @click.self="handleClose">
    <div class="reauth-card">
      <div class="icon">🔑</div>
      <h3>Требуется повторная авторизация</h3>
      <p>Ваш токен доступа истек.</p>
      
      <!-- ✅ Используем store напрямую -->
      <p v-if="technicalStore.isSyncing" class="warning-text">
        ⏳ Подождите, идет синхронизация...
      </p>
      
      <p v-if="errorMessage" class="error-text">
        ❌ {{ errorMessage }}
      </p>
      
      <button 
        @click="handleRefresh" 
        class="refresh-btn"
        :disabled="technicalStore.status === 'loading' || technicalStore.isSyncing"
      >
        {{ technicalStore.status === 'loading' ? 'Подключение...' : 'Обновить доступ' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { AuthFactory } from "@/services/AuthFactory";
import { useTechnicalStore } from '@/services/TechnicalStore';

const props = defineProps<{
  show: boolean;     
  providerId: string;
}>();

const emit = defineEmits(['close', 'success']);

// ✅ Просто используем store
const technicalStore = useTechnicalStore();
const errorMessage = ref<string | null>(null);

const handleRefresh = async () => {
  // ✅ Проверяем напрямую из store
  if (technicalStore.status === 'loading' || technicalStore.isSyncing) return;
  
  errorMessage.value = null;
  technicalStore.setStatus('loading');

  try {
    const provider = AuthFactory.getProvider(props.providerId);
    const authResult = await provider.authorize();
    
    technicalStore.setAuth(
      authResult.access_token,
      props.providerId,
      authResult.expires_in
    );
    technicalStore.setStatus('success');
    
    emit('success', authResult.access_token);
    handleClose();
    
  } catch (error: any) {
    console.error('❌ Ошибка обновления:', error);
    errorMessage.value = error?.message || 'Не удалось обновить сессию';
    technicalStore.setStatus('error');
  }
};

const handleClose = () => {
  emit('close');
};
</script>

<style scoped>
.reauth-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  pointer-events: auto;
}

.reauth-card {
  background: white;
  border-radius: 16px;
  padding: 32px;
  max-width: 420px;
  width: 90%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease-out;
}

.icon {
  font-size: 48px;
  margin-bottom: 16px;
}

h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  color: #1a1a1a;
}

p {
  margin: 8px 0;
  color: #666;
  font-size: 14px;
  line-height: 1.5;
}

.refresh-btn {
  margin-top: 20px;
  padding: 12px 32px;
  background: #4285F4;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  background: #3367D6;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(66, 133, 244, 0.3);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.close-btn {
  margin-top: 12px;
  margin-left: 8px;
  padding: 12px 24px;
  background: transparent;
  color: #666;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover:not(:disabled) {
  background: #f5f5f5;
}

.close-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>