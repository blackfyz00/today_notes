// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import Calendar from '@/views/Calendar.vue'
import AuthPage from '@/views/AuthPage.vue'
import HelloWorld from '@/components/HelloWorld.vue'

const routes = [
  { 
    path: '/auth', 
    component: AuthPage 
  },
  { 
    path: '/', 
    component: Calendar,
    meta: { requiresAuth: true }
  },
  { 
    path: '/test', 
    component: HelloWorld 
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');
  const isAuthRequired = to.matched.some(record => record.meta.requiresAuth);

  if (isAuthRequired && !token) {
    next('/auth'); 
  } 
  else if (to.path === '/auth' && token) {
    next('/');
  } 
  else {
    next();
  }
});

export default router
