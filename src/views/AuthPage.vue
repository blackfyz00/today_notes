<template>
  <LoadingOverlay :show="snapshot.matches('loading')" />
  <div class="auth-container">
    <h1 :class="{ 'error-text': hasError }">Добро пожаловать!</h1>
    
    <p class="main-text">
      Пожалуйста, войдите в свой аккаунт, чтобы продолжить работу.
    </p>

    <!-- Используем isShaking для анимации, hasError для цвета -->
    <form 
      class="form" 
      :class="{ 'error': hasError, 'shake-animation': isShaking }"
      @submit.prevent="handleLogin"
    >
      <h2>Авторизация</h2>

      <transition name="fade">
        <p v-if="hasError" class="error-message">
          ❌ Неверный email или пароль
        </p>
      </transition>

      <div class="form-group">
        <label for="email">Email адрес</label>
        <input 
          type="email" 
          id="email" 
          v-model="email" 
          placeholder="name@example.com" 
          required
          :class="{ 'input-error': hasError }"
        />
      </div>

      <div class="form-group">
        <label for="password">Пароль</label>
        <input 
          type="password" 
          id="password" 
          v-model="password" 
          placeholder="••••••••" 
          required
          :class="{ 'input-error': hasError }"
        />
      </div>

      <!-- Теперь кнопка блокируется, когда машина в состоянии загрузки -->
      <button type="submit" class="submit-btn" :disabled="snapshot.matches('loading')">
        {{ snapshot.matches('loading') ? 'Вход...' : 'Войти' }}
      </button>

      <p class="register-link">
        Нет аккаунта? 
        <a href="#" class="link">Зарегистрироваться</a>
      </p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { nextTick } from 'vue'; // 1. Импортируем nextTick
import LoadingOverlay from '../components/loadingOverlay.vue';
import { useMachine } from '@xstate/vue';
import { loadingMachine } from '../composables/xstate.ts';

const { snapshot, send } = useMachine(loadingMachine);
const router = useRouter(); 

const email = ref<string>('');
const password = ref<string>('');
const isLoading = ref<boolean>(false);
const hasError = ref<boolean>(false); 
const isShaking = ref<boolean>(false);

const handleLogin = async () => {
  hasError.value = false;
  isShaking.value = false; 

  // 1. Переводим машину в загрузку (LoadingOverlay покажется сам)
  send({ type: 'FETCH' });

  try {
    const apiUrl = 'http://localhost:8000';
    
    // Эмуляция задержки
    await new Promise(r => setTimeout(r, 500));

    const response = await fetch(`${apiUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.value,
        password: password.value
      })
    });

    if (!response.ok) throw new Error();

    const data = await response.json();
    localStorage.setItem('token', data.access_token);
    
    // 2. Успех
    send({ type: 'SUCCESS' });
    router.push('/');
    
  } catch (error) {
    // 3. ОШИБКА: Обязательно уведомляем машину, чтобы скрыть лоадер!
    send({ type: 'ERROR' });
    
    hasError.value = true;
    
    // Перезапуск анимации тряски
    isShaking.value = false;
    await nextTick();
    isShaking.value = true;

    setTimeout(() => { isShaking.value = false; }, 400);
    setTimeout(() => { hasError.value = false; }, 10000);
  }
};
</script>

<style scoped>
.auth-container {
  text-align: center;
  margin-top: 6rem;
  min-height: 80vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

h1 {
  font-size: 2.5rem;
  color: var(--heading-color, #2c3e50);
  font-weight: 700;
  margin-bottom: 1rem;
  position: relative;
  display: inline-block;
}

h1::after {
  content: '';
  display: block;
  width: 60px;
  height: 4px;
  background: linear-gradient(90deg, #3498db, #2ecc71);
  border-radius: 2px;
}

h1.error-text::after {
  background: linear-gradient(90deg, #e74c3c, #c0392b);
  transition: background 0.3s ease;
}

.main-text {
  font-size: 1.125rem;
  color: var(--text-secondary, #6c757d);
  max-width: 600px;
  line-height: 1.6;
  margin-bottom: 0.5rem;
}

.form {
  width: 100%;
  max-width: 520px;
  padding: 22px;
  background: var(--card-bg, #ffffff);
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  position: relative;
  overflow: hidden;
  text-align: left;
  box-sizing: border-box;
  transition: box-shadow 0.3s ease;
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
  z-index: 10;
}

.form.error::before {
  background: linear-gradient(90deg, #e74c3c, #c0392b);
}

.form h2 {
  font-size: 1.75rem;
  color: var(--heading-color, #2c3e50);
  margin: 0 0 22px 0;
  text-align: center;
}

.form-group {
  margin-bottom: 10px;
  min-height: 90px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-secondary, #6c757d);
}

.form-group input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--input-border, #dee2e6);
  border-radius: 8px;
  font-size: 1rem;
  color: var(--text-primary, #212529);
  background-color: var(--input-bg, #f8f9fa);
  transition: all 0.2s ease;
  outline: none;
  box-sizing: border-box;
}

.form-group input:focus {
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.15);
  background-color: var(--bg-primary, #fff);
}

.form.error .form-group input {
  border-color: #e74c3c;
  background-color: rgba(231, 76, 60, 0.05);
}

.form.error .form-group input:focus {
  border-color: #c0392b;
  box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.15);
}

.submit-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
  margin-top: 10px;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(52, 152, 219, 0.4);
}

.submit-btn:active:not(:disabled) {
  transform: translateY(0);
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.register-link {
  margin-top: 24px;
  font-size: 0.95rem;
  color: var(--text-secondary, #6c757d);
  text-align: center;
}

.link {
  color: #3498db;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s;
}

.link:hover {
  color: #2980b9;
  text-decoration: underline;
}

.error-message-placeholder {
  color: transparent;
  font-size: 0.9rem;
  text-align: center;
  font-weight: 500;
  border-radius: 6px;
  margin: 0 0 20px 0;
  min-height: 1.4em;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  pointer-events: none;
}

.error-message {
  color: #e74c3c;
  font-size: 0.9rem;
  text-align: center;
  font-weight: 500;
  border-radius: 6px;
  margin: 8px 0 20px 0;
  min-height: 1.4em;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: 70px;
  left: 36px;
  right: 36px;
}

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

@media (max-width: 600px) {
  .form {
    padding: 24px 20px;
  }
  
  h1 {
    font-size: 2rem;
  }

  .error-message {
    left: 20px;
    right: 20px;
    top: 64px;
  }
}
</style>