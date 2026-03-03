<template>
  <div class="auth-container">
    <!-- Заголовок страницы (использует стили h1) -->
    <h1>Добро пожаловать</h1>
    
    <p class="main-text">
      Пожалуйста, войдите в свой аккаунт, чтобы продолжить работу.
    </p>

    <!-- Форма авторизации -->
    <form class="form" @submit.prevent="handleLogin">
      <h2>Авторизация</h2>

      <!-- Поле Email -->
      <div class="form-group">
        <label for="email">Email адрес</label>
        <input 
          type="email" 
          id="email" 
          v-model="email" 
          placeholder="name@example.com" 
          required
        />
      </div>

      <!-- Поле Пароль -->
      <div class="form-group">
        <label for="password">Пароль</label>
        <input 
          type="password" 
          id="password" 
          v-model="password" 
          placeholder="••••••••" 
          required
        />
      </div>

      <!-- Кнопка входа -->
      <button type="submit" class="submit-btn" :disabled="isLoading">
        {{ isLoading ? 'Вход...' : 'Войти' }}
      </button>

      <!-- Дополнительный текст (ссылка на регистрацию) -->
      <p style="margin-top: 24px; font-size: 0.95rem;">
        Нет аккаунта? 
        <a href="#" style="color: #3498db; text-decoration: none; font-weight: 600;">Зарегистрироваться</a>
      </p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
const router = useRouter(); 

// Состояние формы
const email = ref<string>('');
const password = ref<string>('');
const isLoading = ref<boolean>(false);

// Обработчик отправки формы
const handleLogin = async () => {
  isLoading.value = true;

  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.value,
        password: password.value
      })
    });

    if (!response.ok) {
      throw new Error('Ошибка авторизации');
    }

    const data = await response.json();
    
    // Сохраняем токен
    localStorage.setItem('token', data.access_token);
    router.push('/')
  } catch (error) {
    alert('Неверный логин или пароль');
  } finally {
    isLoading.value = false;
  }
};

</script>

<style scoped>
/* Глобальные переменные темы */
:root {
  /* Светлая тема по умолчанию */
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --text-primary: #212529;
  --text-secondary: #6c757d;
  --border-color: #dee2e6;
  --card-bg: #ffffff;
  --button-bg: linear-gradient(135deg, #3498db, #2ecc71);
  --heading-color: #2c3e50;
  --input-border: #e0e6ed;
  --input-bg: #fafbfd;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #121212;
    --bg-secondary: #1e1e24;
    --text-primary: #ecf0f1;
    --text-secondary: #bdc3c7;
    --border-color: rgba(255, 255, 255, 0.1);
    --card-bg: rgba(30, 30, 38, 0.7);
    --button-bg: linear-gradient(135deg, #3498db, #2ecc71);
    --heading-color: #ecf0f1;
    --input-border: rgba(255, 255, 255, 0.15);
    --input-bg: rgba(255, 255, 255, 0.05);
  }
}

/* Общие стили */
body {
  text-align: center;
  margin: 0;
  padding: 0vw clamp(3px, 10vw, 100px);
  box-sizing: border-box;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  transition: background-color 0.3s, color 0.3s;
}

/* Заголовки */
h1,
.form h2 {
  color: var(--heading-color);
  font-weight: 700;
  letter-spacing: -0.5px;
  font-family: inherit;
  margin: 2rem auto 1.5rem;
  position: relative;
  text-align: center;
}

h1 {
  font-size: 2.5rem;
  line-height: 1.2;
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

.form h2 {
  font-size: 28px;
  margin-bottom: 32px;
  margin-top: 0; /* Сброс отступа для заголовка внутри формы */
}

/* Текстовые абзацы */
p {
  font-size: 1.125rem;
  line-height: 1.6;
  font-weight: 400;
  max-width: 700px;
  margin: 0 auto 1.5rem;
  opacity: 0.9;
  transition: opacity 0.2s;
}

p:hover {
  opacity: 1;
}

.main-text {
  margin-bottom: 2rem;
}

/* Форма */
.form {
  max-width: 520px;
  margin: 48px auto;
  padding: 36px;
  background: var(--card-bg);
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  position: relative;
  overflow: hidden;
  text-align: left; /* Выравнивание контента формы по левому краю */
}

.form::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #3498db, #2ecc71);
}

.form-group {
  margin-bottom: 24px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.3px;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid var(--input-border);
  border-radius: 10px;
  font-size: 16px;
  color: var(--text-primary);
  background-color: var(--input-bg);
  transition: all 0.3s ease;
  outline: none;
  font-family: inherit;
  box-sizing: border-box; /* Важно для input */
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: #3498db;
  background-color: var(--bg-primary);
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.15);
}

/* Кнопка отправки */
.submit-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
  font-family: inherit;
  margin-top: 10px;
}

.submit-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #2980b9, #2573a7);
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

/* Адаптивность */
@media (max-width: 900px) {
  .auth-container{
    margin-top: 7rem;
  }
  .form {
    padding: 1rem;
  }

  body {
    margin-top: 1rem;
  }

  .form h2 {
    font-size: 24px;
  }
  
  h1 {
    font-size: 2rem;
  }
}
</style>