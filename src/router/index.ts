// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import Calendar from '@/views/Calendar.vue'
import NewNoteModal from '@/views/NewNoteModal.vue'

const routes = [
  { path: '/test', component: NewNoteModal },
  { path: '/', component: Calendar }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router