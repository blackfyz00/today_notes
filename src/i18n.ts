import { createI18n } from 'vue-i18n'
import ru from '@/locales/ru.json'
import en from '@/locales/en.json'

// Поддерживаемые локали
export const SUPPORTED_LOCALES = ['ru', 'en'] as const
export type SupportedLocale = typeof SUPPORTED_LOCALES[number]

// 1. Пытаемся получить сохранённую локаль
const savedLocale = 'ru'// localStorage.getItem('locale')

// 2. Если нет — определяем системную
let initialLocale: SupportedLocale = 'ru' // fallback

if (!savedLocale) {
  // Получаем системный язык
  const systemLang = navigator.language || (navigator as any).userLanguage || 'ru'
  const langCode = systemLang.split('-')[0] // 'ru-RU' → 'ru'

  // Находим ближайшую поддерживаемую локаль
  if (SUPPORTED_LOCALES.includes(langCode as SupportedLocale)) {
    initialLocale = langCode as SupportedLocale
  } else {
    // Например, если система на 'fr-FR', но у нас только ru/en → fallback
    initialLocale = 'ru'
  }

  // Сохраняем для будущих запусков
  localStorage.setItem('locale', initialLocale)
} else {
  // Используем сохранённую (с проверкой)
  initialLocale = SUPPORTED_LOCALES.includes(savedLocale as SupportedLocale)
    ? (savedLocale as SupportedLocale)
    : 'ru'
}

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: initialLocale,
  fallbackLocale: 'ru',
  messages: { ru, en }
})

export default i18n