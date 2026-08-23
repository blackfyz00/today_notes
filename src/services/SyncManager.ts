// src/services/SyncManager.ts
import type { Note } from "@/services/Note";
import type { ICloudStorage } from "@/interfaces/ICloudStorage";

export class SyncManager {
  /**
   * Синхронизировать месяц между локальным и облачным хранилищем
   */
   // src/services/SyncManager.ts

    
   static async syncMonth(
     month: string,
     queue: Note[],
     removeSyncedNotes: (syncedNotes: Note[]) => void,
     localDB: ICloudStorage,
     cloudDB: ICloudStorage
   ): Promise<void> {
     try {
       console.log(`🔄 Syncing month: ${month}`);
       function getCleanPath(path: string): string {
         return path.replace(/\.deleted$/, '');
       }
       // ============================================
       // ШАГ 0: Подготовка данных
       // ============================================
       
       const [year, monthNum] = month.split('/').map(Number);
       if (!year || !monthNum) {
         throw new Error(`Invalid month format: ${month}`);
       }
       
       const monthDate = new Date(year, monthNum - 1, 1);
       
       const [cloudStats, localStats] = await Promise.all([
         cloudDB.getMonthStats(monthDate),
         localDB.getMonthStats(monthDate)
       ]);
   
        // ============================================
        // ШАГ 1: Облачные заметки
        // ============================================
        const cloudNotesMap = new Map<string, Note>();
        
        for (const stat of cloudStats) {
          const dayNotes = await cloudDB.getNotesForDay(stat.date);
          for (const note of dayNotes) {
            // ✅ ИСПРАВЛЕНО: используем getCleanPath()
            const id = getCleanPath(note.filenameLink);
            cloudNotesMap.set(id, note);
            if (note.deleted) {
              console.log(`🗑️ Cloud deleted: ${id}`);
            }
          }
        }
        
        // ============================================
        // ШАГ 2: Локальные заметки
        // ============================================
        const localNotesMap = new Map<string, Note>();
        
        for (const stat of localStats) {
          const dayNotes = await localDB.getNotesForDay(stat.date);
          for (const note of dayNotes) {
            // ✅ ИСПРАВЛЕНО: используем getCleanPath()
            const id = getCleanPath(note.filenameLink);
            localNotesMap.set(id, note);
            if (note.deleted) {
              console.log(`🗑️ Local deleted: ${id}`);
            }
          }
        }
          
       // ============================================
       // ШАГ 3: Определяем, что нужно синхронизировать
       // ============================================
       
       const allIds = new Set([...cloudNotesMap.keys(), ...localNotesMap.keys()]);
       const queueIds = new Set(queue.map((n: Note) => getCleanPath(n.filenameLink)));
       const successfullySynced: Note[] = [];
   
       // ============================================
       // ШАГ 4: Синхронизация
       // ============================================
       
       for (const id of allIds) {
         const localNote = localNotesMap.get(id);
         const cloudNote = cloudNotesMap.get(id);
         
         if (queueIds.has(id)) {
           console.log(`⏭️ Skipping ${id} - in queue (local wins)`);
           continue;
         }
         
         // ✅ 1. СНАЧАЛА проверяем удаленные локально
         if (localNote && localNote.deleted) {
           if (cloudNote && !cloudNote.deleted) {
             // Удалена локально, есть в облаке → удаляем в облаке
             console.log(`🗑️ Deleting from cloud: ${localNote.filenameLink}`);
             await cloudDB.deleteFile(localNote.filenameLink);
           } else if (!cloudNote) {
             // Удалена локально, нет в облаке → ничего не делаем
             console.log(`⏭️ Skipping deleted local note (no cloud): ${localNote.filenameLink}`);
           } else if (cloudNote && cloudNote.deleted) {
             // Удалена везде → ничего не делаем
             console.log(`⏭️ Both deleted: ${localNote.filenameLink}`);
           }
           continue; // ← ВАЖНО: пропускаем дальше!
         }
         
         // ✅ 2. ПОТОМ проверяем удаленные в облаке
         if (cloudNote && cloudNote.deleted) {
           if (localNote && !localNote.deleted) {
             console.log(`🗑️ Deleting locally: ${cloudNote.filenameLink}`);
             await localDB.deleteFile(cloudNote.filenameLink);
           }
           continue;
         }
         
         // ✅ 3. ПОТОМ проверяем новые заметки
         if (localNote && !cloudNote) {
           console.log(`☁️ Uploading new note: ${localNote.filenameLink}`);
           await SyncManager.uploadToCloud(localDB, cloudDB, localNote);
           successfullySynced.push(localNote);
           continue;
         }
         
         // ✅ 4. ПОТОМ скачиваем
         if (cloudNote && !localNote) {
           console.log(`📥 Downloading new note: ${cloudNote.filenameLink}`);
           await SyncManager.downloadFromCloud(cloudDB, localDB, cloudNote);
           continue;
         }
         
         // ✅ 5. ПОТОМ сравниваем даты
         if (localNote && cloudNote) {
           const localDate = new Date(localNote.updated_at || 0);
           const cloudDate = new Date(cloudNote.updated_at || 0);
           
           if (localDate > cloudDate) {
             console.log(`☁️ Updating cloud (local newer): ${localNote.filenameLink}`);
             await SyncManager.uploadToCloud(localDB, cloudDB, localNote);
             successfullySynced.push(localNote);
           } else if (cloudDate > localDate) {
             console.log(`📥 Updating local (cloud newer): ${cloudNote.filenameLink}`);
             await SyncManager.downloadFromCloud(cloudDB, localDB, cloudNote);
           }
         }
       }
   
       // ============================================
       // ШАГ 5: Очистка очереди
       // ============================================
       
       if (successfullySynced.length > 0) {
         removeSyncedNotes(successfullySynced);
       }
   
       console.log(`✅ Month ${month} synced successfully`);
       
     } catch (error) {
       console.error(`❌ Sync failed for month ${month}:`, error);
       throw error;
     }
   }
    
  /**
   * Загрузить заметку в облако
   */
  private static async uploadToCloud(
    local: ICloudStorage,
    cloud: ICloudStorage,
    note: Note
  ): Promise<void> {
    try {
      const blob = await local.getFile(note.filenameLink);
      if (!blob) {
        console.warn(`⚠️ Local file not found: ${note.filenameLink}`);
        return;
      }
      
      await cloud.saveFile(note.filenameLink, blob, {
        title: note.title || "Без названия",
        created_at: note.created_at || new Date().toISOString(),
        updated_at: note.updated_at || new Date().toISOString(),
        note_id: note.id || "unknown"
      });
      
    } catch (error) {
      console.error(`❌ Failed to upload ${note.filenameLink}:`, error);
      throw error;
    }
  }

  /**
   * Скачать заметку из облака
   */
  private static async downloadFromCloud(
    cloud: ICloudStorage,
    local: ICloudStorage,
    note: Note
  ): Promise<void> {
    try {
      const blob = await cloud.getFile(note.filenameLink);
      if (!blob) {
        console.warn(`⚠️ Cloud file not found: ${note.filenameLink}`);
        return;
      }
      
      await local.saveFile(note.filenameLink, blob);
      
    } catch (error) {
      console.error(`❌ Failed to download ${note.filenameLink}:`, error);
      throw error;
    }
  }

  /**
   * Полная синхронизация всех заметок
   */
   static async fullSync(
     localDB: ICloudStorage,
     cloudDB: ICloudStorage,
     removeSyncedNotes?: (syncedNotes: Note[]) => void
   ): Promise<void> {
     console.log('🔄 Starting full sync...');
     
     try {
       const now = new Date();
       const months = new Set<string>();
       
       // ✅ 1. Добавляем последние 2 месяца
       for (let i = 0; i < 2; i++) {
         const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
         const prefix = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
         months.add(prefix);
       }
       
       // ✅ 2. Добавляем текущий месяц (если ещё не добавлен)
       const currentMonth = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
       months.add(currentMonth);
       
       // ✅ 3. Добавляем следующий месяц (на всякий случай)
       const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
       const nextMonthPrefix = `${nextMonth.getFullYear()}/${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
       months.add(nextMonthPrefix);
       
       // Или более универсально:
       // Добавляем все месяцы с прошлого месяца до следующего
       for (let i = -1; i <= 1; i++) {
         const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
         const prefix = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
         months.add(prefix);
       }
       
       console.log(`📅 Months to sync: ${Array.from(months).join(', ')}`);
       
       const allSyncedNotes: Note[] = [];
       
       for (const month of months) {
         await this.syncMonth(
           month, 
           [], 
           (notes: Note[]) => { allSyncedNotes.push(...notes); }, 
           localDB, 
           cloudDB
         );
       }
       
       if (removeSyncedNotes && allSyncedNotes.length > 0) {
         removeSyncedNotes(allSyncedNotes);
         console.log(`🧹 Full sync: cleared ${allSyncedNotes.length} notes`);
       }
       
       console.log('✅ Full sync completed');
       
     } catch (error) {
       console.error('❌ Full sync failed:', error);
       throw error;
     }
   }
}