// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import Calendar from '@/views/Calendar.vue'
import AuthPage from '@/views/AuthPage.vue'

const routes = [
  { path: '/auth', component: AuthPage },
  { path: '/', component: Calendar }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router