// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import Calendar from '@/views/Calendar.vue'
import AllNotes from '@/views/AllNotes.vue'
import AuthPage from '@/views/AuthPage.vue'
import SettingsPage from '@/views/SettingsPage.vue'
import DonatePage from '@/views/DonatePage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Calendar, meta: { requiresAuth: true } },
    { path: '/notes', component: AllNotes, meta: { requiresAuth: true } },
    { path: '/login', component: AuthPage, meta: { guestOnly: true } },
    
    { path: '/settings', component: SettingsPage, meta: { requiresAuth: false } },
    { path: '/donate', component: DonatePage, meta: { requiresAuth: false } },
    
    { path: '/auth', redirect: '/login' }, 
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ]
})

router.beforeEach((to, from, next) => {
  if (window.location.hash.includes('access_token=')) {
    const params = new URLSearchParams(window.location.hash.substring(1));
    const token = params.get('access_token');
    
    const providerId = params.get('state') || 'google'; 

    if (token) {
      localStorage.setItem("access_token", token);
      localStorage.setItem("auth_provider_id", providerId); 
      window.location.hash = ''; 
    }
  }

  const token = localStorage.getItem('access_token');
  const isAuthenticated = !!token;

  if (to.meta?.requiresAuth && !isAuthenticated) {
    next('/login'); 
  } else if (to.meta?.guestOnly && isAuthenticated) {
    next('/'); 
  } else {
    next(); 
  }
});

export default router;
