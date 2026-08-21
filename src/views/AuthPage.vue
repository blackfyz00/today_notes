<!-- src/views/AuthPage.vue -->
<template>
  <div class="auth-container">
    <h1 :class="{ 'error-text': isError }">Добро пожаловать!</h1>
    
    <p class="main-text">
      Войдите через облачный сервис, чтобы ваши заметки и медиафайлы сохранялись в вашем личном хранилище.
    </p>

    <div 
      class="form" 
      :class="{ 'error': isError, 'shake-animation': isShaking }"
    >
      <h2>Авторизация</h2>

      <transition name="fade">
        <p v-if="isError" class="error-message">
          ❌ Ошибка авторизации. Убедитесь, что вы выбрали аккаунт и разрешили доступ к диску.
        </p>
      </transition>

      <div class="google-btn-wrapper" v-for="s in services" :key="s.id">
        <button 
          @click="login(s)" 
          class="submit-btn google-btn"
          :style="{ backgroundColor: s.color || '#4285F4' }"
          :disabled="isLoading"
        >
          <!-- Использование иконки из вашего интерфейса провайдера -->
          <span class="btn-icon">📁</span>
          {{ isLoading ? 'Подключение...' : `Войти через ${s.name}` }}
        </button>
      </div>

      <p class="info-text">
        Приложению потребуется доступ только к файлам, созданным этим приложением.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed} from 'vue';
import { useRouter } from 'vue-router';

import { AuthFactory } from "@/services/AuthFactory";
import type { IAuthProvider } from "@/interfaces/IAuthProvider";

import { type IServiceUI } from '@/interfaces/IServiceUI';
import { useTechnicalStore } from '@/services/TechnicalStore';
import { useSyncStore } from '@/services/SyncStore';

const syncStore = useSyncStore()
const router = useRouter();
const technicalStore = useTechnicalStore();
const isLoading = computed(() => technicalStore.status === 'loading');
const isError = computed(() => technicalStore.status === 'error');
const isShaking = ref(false)
import { modalService } from '@/services/ModalService'; 
import rewriteTokenAuth from '@/views/rewriteTokenAuth.vue';

const services = AuthFactory.getAvailableProviders();

const openReauthModal = (providerId: string) => {
  const modalId = modalService.open(rewriteTokenAuth, {
    providerId,
    onClose: () => {
      modalService.close(modalId)
      router.push('/login')
    },
    onSuccess: async () => {
      await router.push('/')
    }
  })
}

const login = async (service: IServiceUI) => {
  try {
    technicalStore.setStatus('loading')
    
    const provider: IAuthProvider = AuthFactory.getProvider(service.id)
    console.log(`🔐 Инициализация входа через провайдер: ${provider.name}`)
    
    if (provider.setOnAuthRequired) {
      provider.setOnAuthRequired(() => {
        console.log(`🔐 Токен протух (${provider.id}), открываем модалку`)
        openReauthModal(provider.id) 
      })
    }
    
    const token = await provider.authorize()
    console.log("✅ Токен успешно получен")
    
    technicalStore.setAuth(token, provider.id)
    technicalStore.setStatus('success')
    
    await router.push('/')
    syncStore.startPeriodicSync(120000)
    
  } catch (error) {
    console.error("❌ Ошибка авторизации:", error)
    
    isShaking.value = true
    setTimeout(() => {
      isShaking.value = false
    }, 500)
    technicalStore.setStatus('error')
  }
}

</script>

<style scoped>
.auth-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
  box-sizing: border-box;
  /* Современный минималистичный шрифт */
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow: hidden; 
}

h1 {
  font-size: 2.5rem;
  color: var(--heading-color, #2c3e50);
  font-weight: 700;
  letter-spacing: -0.5px;
  line-height: 1.2;
  margin: 0 auto 1.5rem;
  position: relative;
  display: inline-block;
  text-align: center; /* Центрирование текста */
}

h1::after {
  content: '';
  display: block;
  width: 60px;
  height: 4px;
  background: linear-gradient(90deg, #3498db, #2ecc71);
  margin: 16px auto 0;
  border-radius: 2px;
}

h1.error-text::after {
  background: linear-gradient(90deg, #e74c3c, #c0392b);
  transition: background 0.3s ease;
}

.main-text {
  font-size: 1.125rem;
  line-height: 1.6;
  font-weight: 400;
  max-width: 600px;
  margin: 0 auto 2.5rem; /* Центрирование блока текста */
  text-align: center; /* Центрирование текста внутри */
  opacity: 0.9;
  transition: opacity 0.2s;
}

.btn-icon {
  width: 20px;        
  height: 20px;       
  object-fit: contain;
  flex-shrink: 0;    
}

.main-text:hover {
  opacity: 1;
}

.form {
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
  padding: 36px;
  background: var(--card-bg, #ffffff);
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
  /* Центрирование всех элементов внутри формы */
  display: flex;
  flex-direction: column;
  align-items: center;
}

.form::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #3498db, #2ecc71);
  transition: background 0.3s ease;
  z-index: 1;
}

.form.error::before {
  background: linear-gradient(90deg, #e74c3c, #c0392b);
}

.form h2 {
  font-size: 28px;
  color: var(--heading-color, #2c3e50);
  font-weight: 700;
  letter-spacing: -0.5px;
  margin: 0 0 32px 0;
  text-align: center; /* Центрирование заголовка формы */
}

.auth-btn-wrapper {
  display: flex;
  justify-content: center;
  width: 100%; /* Растягиваем контейнер кнопки */
  padding: 8px 0;
}

.auth-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  padding: 14px;
  background: #ffffff;
  color: #3c4043;
  border: 1px solid #dadce0;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  letter-spacing: 0.5px;
  font-family: inherit; /* Наследование нового шрифта */
}

.auth-btn:hover:not(:disabled) {
  background-color: #f8f9fa;
  box-shadow: 0 1px 3px rgba(60,64,67, 0.3);
  transform: translateY(-2px);
}

.auth-btn:active:not(:disabled) {
  transform: translateY(0);
}

.auth-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.info-text {
  font-size: 12px;
  color: #70757a;
  text-align: center; /* Центрирование подписи */
  margin-top: 10px;
  opacity: 0.9;
}

.error-message {
  width: 100%; /* Растягиваем на всю ширину формы */
  box-sizing: border-box;
  color: #e74c3c;
  font-size: 0.9rem;
  line-height: 1.4;
  text-align: center; /* Центрирование текста ошибки */
  font-weight: 500;
  background-color: rgba(231, 76, 60, 0.1);
  padding: 10px;
  border-radius: 8px;
  margin: 0 0 20px 0;
}

/* Сохраненные анимации */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
}

.shake-animation {
  animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

@media (max-width: 900px) {
  .form {
    margin: 1.5rem;
    padding: 28px;
  }

  .form h2 {
    font-size: 24px;
  }
}

@media (max-width: 600px) {
  h1 {
    font-size: 2rem;
  }
}
</style>
