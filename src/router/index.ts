// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import CheckNotes from '@/views/NotesModalView.vue'
import Calendar from '@/views/Calendar.vue'

const routes = [
  { path: '/test', component: CheckNotes },
  { path: '/', component: Calendar }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router