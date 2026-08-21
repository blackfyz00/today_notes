import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './main.css'
import App from './App.vue'
import router from './router'
import i18n from './i18n' 
import { SocialLogin } from '@capgo/capacitor-social-login'

(async () => {
  try {
    await SocialLogin.initialize({
      google: {
        webClientId: '475530237173-bjrci3ft4bc1qmrpicln5c7n67qq7krt.apps.googleusercontent.com'
      }
    });
    console.log('Capacitor Social Login успешно инициализирован');
  } catch (error) {
    console.error('Ошибка инициализации Social Login:', error);
  }

  const app = createApp(App)

  app.use(createPinia())
  app.use(router)
  app.use(i18n)

  app.mount('#app')
})()
