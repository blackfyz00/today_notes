// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import SuccessView from '../views/SuccessView.vue'
import HomePage from '@/views/HomePage.vue'

const routes = [
  { path: '/success', component: SuccessView },
  { path: '/', component: HomePage }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router