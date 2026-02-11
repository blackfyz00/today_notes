// src/i18n.ts
import { createI18n } from 'vue-i18n'
import ru from '@/locales/ru.json'
import en from '@/locales/en.json'

export const messages = { ru, en }

const i18n = createI18n({
  allowComposition: true,  // to use with Composition API
  legacy: true,           // so that VueI18n still works with Options API
  locale: 'ru',
  fallbackLocale: 'ru',
  messages: { ru, en }
})

export default i18n