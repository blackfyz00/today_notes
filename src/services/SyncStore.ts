// src/stores/syncStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Note } from '@/services/Note'
import { SyncManager } from '@/services/SyncManager'
import { LocalDB } from '@/services/IndexedDB'
import { GoogleCloud } from '@/services/cloudStorages/googleCloudStorage'
import { ZipPacker } from '@/services/ZipPacker'
import type { InteractiveDoc } from '@/services/InteractiveDoc'
import { useTechnicalStore } from '@/services/TechnicalStore';

export const useSyncStore = defineStore('syncStore', () => {
  // ==================== STATE ====================
  const queue = ref<Note[]>([])
  const lastSyncTime = ref<Date | null>(null)
  const syncErrors = ref<string[]>([])
  const syncProgress = ref<{ current: number; total: number } | null>(null)
  const technicalStore = useTechnicalStore();
  const deleteQueue = ref<string[]>([])
    
  const isAuthError = ref(false)
  let isStopping = false
  let syncTimeout: ReturnType<typeof setTimeout> | null = null
  let syncTimer: ReturnType<typeof setInterval> | null = null

  // ==================== STORAGE ====================
  const cloudDB = GoogleCloud

  // ==================== GETTERS ====================
  const queueSize = computed(() => queue.value.length)
  const hasPendingNotes = computed(() => queue.value.length > 0)
    const isOnline = computed(() => technicalStore.isOnline);

  // ==================== ACTIONS ====================

  /**
   * Добавить заметку в очередь синхронизации
   */
   function addToQueue(note: Note) {
     const index = queue.value.findIndex(item => item.id === note.id)
     if (index !== -1) {
       queue.value[index] = note
     } else {
       queue.value.push(note)
     }
    }

   /**
   * Удалить синхронизированные заметки из очереди
   */
  function removeSyncedNotes(syncedNotes: Note[]) {
    queue.value = queue.value.filter(queueItem => {
      const matchedSynced = syncedNotes.find(sn => sn.id === queueItem.id)
      if (!matchedSynced) return true
      
      // Если локальная версия новее - оставляем
      return new Date(queueItem.updated_at!) > new Date(matchedSynced.updated_at!)
    })
  }

   function addToDeleteQueue(filename: string) {
     if (!deleteQueue.value.includes(filename)) {
       deleteQueue.value.push(filename)
       console.log(`🗑️ Добавлено в очередь удаления: ${filename}`)
     }
   }

   async function processDeletions() {
     if (deleteQueue.value.length === 0) return
     
     const toRemove: string[] = []
     
     for (const filename of deleteQueue.value) {
       try {
         // ✅ Не ждём ответа от облака
         cloudDB.deleteFile(filename).catch(err => {
           console.error(`❌ Ошибка удаления ${filename}:`, err);
           syncErrors.value.push(`Failed to delete ${filename}: ${err}`);
         });
         
         // ✅ Сразу считаем удалённым
         toRemove.push(filename);
         console.log(`✅ Удаление отправлено в облако: ${filename}`);
         
       } catch (error) {
         console.error(`❌ Ошибка удаления ${filename}:`, error);
         syncErrors.value.push(`Failed to delete ${filename}: ${error}`);
       }
     }
     
     // Удаляем из очереди (даже если облако ещё не ответило)
     deleteQueue.value = deleteQueue.value.filter(f => !toRemove.includes(f));
   }
    
  /**
   * Обработать очередь синхронизации
   */
   async function processQueue() {
       // ✅ 1. ПРОВЕРКА БЛОКИРОВКИ (ДОБАВИТЬ)
       if (!technicalStore.canSync()) {
           console.log('⛔ Синхронизация заблокирована — требуется переавторизация');
           return;
       }
   
       if (isStopping) return
       if (isAuthError.value) {
           console.log('⛔ Auth error flag set, skipping processQueue')
           return
       }
       if (!isOnline.value) {
           console.log('📡 Offline mode - sync postponed')
           return
       }
   
       technicalStore.startSync();
   
       technicalStore.setStatus('loading')
       syncErrors.value = []
       syncProgress.value = null
   
       try {
           await processDeletions()
           const monthsToSync = new Set<string>()
           
           for (const note of queue.value) {
               const path = note.filenameLink
               const parts = path.split('/')
               if (parts.length >= 2) {
                   monthsToSync.add(`${parts[0]}/${parts[1]}`)
               }
           }
   
           if (monthsToSync.size === 0) {
               const now = new Date()
               monthsToSync.add(`${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`)
           }
   
           syncProgress.value = { current: 0, total: monthsToSync.size }
           const syncedNotes: Note[] = []
           
           for (const monthPrefix of monthsToSync) {
               try {
                   await SyncManager.syncMonth(
                       monthPrefix,
                       queue.value,
                       removeSyncedNotes,
                       LocalDB,
                       cloudDB
                   )
                   
                   const [year, month] = monthPrefix.split('/').map(Number)
                   const monthDate = new Date(year!, month! - 1, 1)
                   const monthStats = await LocalDB.getMonthStats(monthDate)
                   
                   for (const stat of monthStats) {
                       const dayNotes = await LocalDB.getNotesForDay(stat.date)
                       syncedNotes.push(...dayNotes)
                   }
                   
                   if (syncProgress.value) {
                       syncProgress.value.current++
                   }
                   
               } catch (error) {
                   console.error(`❌ Sync failed for ${monthPrefix}:`, error)
                   syncErrors.value.push(`Failed to sync ${monthPrefix}: ${error}`)
                   technicalStore.setStatus('error')
                   throw error
               }
           }
   
           if (syncedNotes.length > 0) {
               removeSyncedNotes(syncedNotes)
           }
   
           lastSyncTime.value = new Date()
           syncProgress.value = null
           technicalStore.setStatus('success')
           
       } catch (error) {
           console.error('❌ Process queue error:', error)
           syncErrors.value.push(`Process queue error: ${error}`)
           technicalStore.setStatus('error')
           throw error
       } finally {
           // ✅ 3. ЗАВЕРШЕНИЕ СИНХРОНИЗАЦИИ (ДОБАВИТЬ)
           technicalStore.finishSync();
       }
   }
    
function stopSyncLogout() {
  isStopping = true
  console.log('🧹 Полная остановка синхронизации');
  
  // 1. Останавливаем периодическую синхронизацию
  stopPeriodicSync();
  
  // 2. Очищаем очередь
  clearQueue();
  
  // 3. Сбрасываем ошибки
  clearErrors();
  
  // 4. Сбрасываем флаг авторизации
  isAuthError.value = false;
  
  // 5. Сбрасываем прогресс
  syncProgress.value = null;
  
  // 6. Сбрасываем время последней синхронизации
  lastSyncTime.value = null;
  
  console.log('✅ Синхронизация полностью остановлена и очищена');
}

  /**
   * Получить заметки за день (с приоритетом локального хранилища)
   */
  async function getNotesForDay(day: Date): Promise<Note[]> {
    try {
      // Сначала пробуем получить локально
      const localNotes = await LocalDB.getNotesForDay(day)
      
      if (localNotes.length > 0) {
        console.log(`📚 Found ${localNotes.length} notes locally for ${day.toDateString()}`)
        return localNotes
      }
      
      // Если локально пусто и есть интернет - загружаем из облака
      if (isOnline.value) {
        console.log(`☁️ Loading notes from cloud for ${day.toDateString()}`)
        const cloudNotes = await cloudDB.getNotesForDay(day)
        
        // Сохраняем локально
        for (const note of cloudNotes) {
          const blob = await cloudDB.getFile(note.filenameLink)
          if (blob) {
            await LocalDB.saveFile(note.filenameLink, blob)
          }
        }
        
        return cloudNotes
      }
      
      console.log(`📡 Offline - no notes found locally for ${day.toDateString()}`)
      return []
      
    } catch (error) {
      console.error('❌ Failed to get notes:', error)
      return []
    }
  }

  /**
   * Получить заметки за месяц
   */
  async function getNotesForMonth(month: Date): Promise<Note[]> {
    try {
      const stats = await LocalDB.getMonthStats(month)
      const notes: Note[] = []
      
      for (const stat of stats) {
        const dayNotes = await getNotesForDay(stat.date)
        notes.push(...dayNotes)
      }
      
      return notes
    } catch (error) {
      console.error('❌ Failed to get notes for month:', error)
      return []
    }
  }

  /**
   * Сохранить заметку (локально + в очередь синхронизации)
   */
  async function saveNote(note: Note, doc: InteractiveDoc): Promise<void> {
    try {
      // 1. Упаковываем в .idoc
      const blob = await ZipPacker.pack(note, doc)
      
      // 2. Сохраняем локально
      await LocalDB.saveFile(note.filenameLink, blob)
      
      // 3. Добавляем в очередь синхронизации
      addToQueue(note)
      
      console.log(`💾 Note saved locally: ${note.filenameLink}`)
      
    } catch (error) {
      console.error('❌ Failed to save note:', error)
      throw error
    }
  }

  async function deleteNote(filename: string): Promise<void> {
      try {
        // 1. Удаляем локально (soft delete)
        await LocalDB.deleteFile(filename)
        
        // 2. Добавляем в очередь удаления
        addToDeleteQueue(filename)
                    
        // 3. Удаляем из очереди синхронизации
        queue.value = queue.value.filter(item => item.filenameLink !== filename)
        
        // 4. Если есть интернет — сразу удаляем
        if (isOnline.value) {
          await processDeletions()
        }
        
        console.log(`🗑️ Note deleted: ${filename}`)
        
      } catch (error) {
        console.error('❌ Failed to delete note:', error)
        throw error
      }
    }

  /**
   * Полная синхронизация
   */
   async function fullSync(): Promise<void> {
     if (!isOnline.value) {
       console.log('📡 Offline mode - full sync postponed');
       return;
     }
     
     await SyncManager.fullSync(LocalDB, cloudDB, removeSyncedNotes);
     clearQueue(); 
     lastSyncTime.value = new Date();
   }

  /**
   * Запустить периодическую синхронизацию
   */
   function startPeriodicSync(intervalMs: number = 60000) {
     isStopping = false
     if (syncTimer) return
   
     if (isAuthError.value || technicalStore.status === 'error') {
       console.log('⛔ Sync blocked due to auth error')
       return
     }
   
     // ✅ УБИРАЕМ СРАЗУ ВЫЗОВ processQueue()
     // processQueue()  // ← КОММЕНТИРУЕМ ИЛИ УДАЛЯЕМ
   
     // ✅ ТОЛЬКО ЗАПУСКАЕМ ИНТЕРВАЛ
     syncTimer = setInterval(() => {
       if (technicalStore.status === 'error') {
         console.log('⛔ Periodic sync blocked due to auth error')
         return
       }
       processQueue()
     }, intervalMs)
   
     console.log(`🔄 Periodic sync started (interval: ${intervalMs}ms)`)
    }
  
   /**
   * Остановить периодическую синхронизацию
   */
  function stopPeriodicSync() {
    if (syncTimer) {
      clearInterval(syncTimer)
      syncTimer = null
      console.log('🔄 Periodic sync stopped')
    }
    // ✅ Очищаем таймаут при остановке
    if (syncTimeout) {
      clearTimeout(syncTimeout);
      syncTimeout = null;
    }
  }

  /**
   * Очистить ошибки
   */
  function clearErrors() {
    syncErrors.value = []
  }

   function clearQueue() {
     queue.value = []
     deleteQueue.value = [] // ✅ ДОБАВИТЬ ЭТУ СТРОКУ
     syncErrors.value = []
     console.log('🧹 Queue cleared')
   }

  // ==================== RETURN ====================
  // ==================== RETURN ====================
  return {
    // State
    queue,
    deleteQueue,        // ✅ НОВО
    lastSyncTime,
    syncErrors,
    syncProgress,
    isOnline,
    
    // Getters
    queueSize,
    hasPendingNotes,
    
    // Actions
    addToQueue,
    addToDeleteQueue,   
    processDeletions,
    stopSyncLogout,
    removeSyncedNotes,
    processQueue,
    getNotesForDay,
    getNotesForMonth,
    saveNote,
    deleteNote,
    fullSync,
    startPeriodicSync,
    stopPeriodicSync,
    clearErrors,
    clearQueue
  }
})