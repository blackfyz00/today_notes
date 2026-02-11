<template>
<h1>{{ $t('h1_hello_text') }}</h1>
  <div class="main-text">
    <p>
      {{$t('mainpagetext')}}
    </p>
  </div>
  
  <div class="form">
    <h2>Обратная связь</h2>
    <form @submit.prevent="handleSubmit">
      <!-- Имя -->
      <div class="form-group">
        <label for="name">Имя</label>
        <input
          id="name"
          type="text"
          placeholder="Ваше имя"
          required
        />
      </div>

      <!-- Email -->
      <div class="form-group">
        <label for="email">Email</label>
        <input
          id="email"
          type="email"
          placeholder="example@mail.com"
          required
        />
      </div>

      <!-- Сообщение -->
      <div class="form-group">
        <label for="message">Сообщение</label>
        <textarea
          id="message"
          placeholder="Напишите что-нибудь..."
          rows="4"
          required
        ></textarea>
      </div>

      <!-- Кнопка -->
      <button type="submit" class="submit-btn">Отправить</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

// Получаем роутер
const router = useRouter()

function handleSubmit() {
  // Здесь можно добавить валидацию или отправку на сервер
  console.log('Форма отправлена!')

  // Переход на другую страницу
  router.push('/success') // ← именно так!
}
</script>

