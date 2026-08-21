<!-- src/components/ReauthModal.vue -->
<template>
  <div class="reauth-overlay" @click.self="handleClose">
    <div class="reauth-card">
      <div class="icon">🔑</div>
      <h3>Упс... Сессия истекла:(</h3>
      <p>Но мы героически защитили ваши данные!</p>
      <p>Чтобы продолжить работу, пожалуйста, обновите вход в облако.</p>
      
      <button 
        @click="handleRefresh" 
        class="refresh-btn"
        :disabled="isLoading"
      >
        OK
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { AuthFactory } from "@/services/AuthFactory";
import { useTechnicalStore } from '@/services/TechnicalStore';
import { modalService } from '@/services/ModalService';

// ==================== PROPS ====================
const props = defineProps<{
  show: boolean;     
  providerId: string;
}>();

// ==================== EMITS ====================
const emit = defineEmits(['close', 'success']);

// ==================== STORE ====================
const technicalStore = useTechnicalStore();
const router = useRouter();

// ==================== COMPUTED ====================
const isLoading = computed(() => technicalStore.status === 'loading');

// ==================== METHODS ====================
const handleRefresh = async () => {
  if (isLoading.value) return;
  
  technicalStore.setStatus('loading');

  try {
    const provider = AuthFactory.getProvider(props.providerId);
    const token = await provider.authorize();
    
    console.log(`✅ Сессия для ${provider.name} успешно обновлена`);
    
    // Обновляем токен
    technicalStore.setAuth(token, props.providerId);
    technicalStore.setStatus('success');
    
    // Уведомляем об успехе
    emit('success', token);
    
    // Закрываем модалку
    handleClose();
    
  } catch (error) {
    console.error(`❌ Не удалось обновить сессию:`, error);
    technicalStore.setStatus('error');
    
    // Можно показать ошибку внутри модалки
    // Или закрыть и показать ErrorOverlay
  }
};

const handleClose = () => {
  // Просто эмитим событие close, ModalManager сам закроет
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