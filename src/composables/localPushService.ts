// src/composables/localPushService.ts
import { LocalNotifications } from '@capacitor/local-notifications';
import { watch, computed } from 'vue';
import { useNotesStore } from '../components/notesStore';

export const useNotificationsSync = () => {
  const notesStore = useNotesStore();

  const getTodayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const todayNotes = computed(() => {
    const key = getTodayKey();
    return notesStore.notesByDate[key] || [];
  });

  const updatePush = async (notes: any[]) => {
    const notificationId = 101;
    try {
      if (notes.length > 0) {
        // Создаем канал (полезно для Android, чтобы задать важность)
        await LocalNotifications.createChannel({
          id: 'calendar_channel',
          name: 'Календарь',
          importance: 3, // Стандартная важность (без всплывающего окна, просто в шторке)
        });

        await LocalNotifications.schedule({
          notifications: [{
            id: notificationId,
            title: "У вас есть планы на сегодня!",
            body: `Заметок на день: ${notes.length}`, // Исправили текст
            ongoing: true,      // Нельзя смахнуть
            autoCancel: false,  // Не исчезает при нажатии
            silent: true,       // Без звука при обновлениях
            channelId: 'calendar_channel',
            schedule: { at: new Date(Date.now() + 100) }
          }]
        });
      } else {
        // Если заметок 0 — удаляем пушку
        await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
      }
    } catch (e) {
      console.error("Ошибка пуш-сервиса:", e);
    }
  };

  const initNotificationWatch = () => {
    watch(todayNotes, (newNotes) => {
      updatePush(newNotes);
    }, { deep: true, immediate: true });
  };

  return { initNotificationWatch, updatePush };
};
