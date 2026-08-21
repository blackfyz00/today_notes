// src/services/SyncManager.ts
import type { Note } from "@/services/Note";
import type { ICloudStorage } from "@/interfaces/ICloudStorage";

export class SyncManager {
  /**
   * Синхронизировать месяц между локальным и облачным хранилищем
   */
  static async syncMonth(
  month: string,
  queue: Note[],
  removeSyncedNotes: (syncedNotes: Note[]) => void,
  localDB: ICloudStorage,
  cloudDB: ICloudStorage
): Promise<void> {
  try {
    console.log(`🔄 Syncing month: ${month}`);

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
    // ШАГ 1: Собираем все заметки за месяц из облака (ВКЛЮЧАЯ deleted)
    // ============================================
    
    const cloudNotesMap = new Map<string, Note>();
    
    for (const stat of cloudStats) {
      const dayNotes = await cloudDB.getNotesForDay(stat.date);
      for (const note of dayNotes) {
        // ✅ Добавляем ВСЕ заметки
        const id = note.id || note.filenameLink;
        cloudNotesMap.set(id, note);
        if (note.deleted) {
          console.log(`🗑️ Cloud deleted: ${id}`);
        }
      }
    }

    // ============================================
    // ШАГ 2: Собираем все заметки за месяц локально (ВКЛЮЧАЯ deleted)
    // ============================================
    
    const localNotesMap = new Map<string, Note>();
    
    for (const stat of localStats) {
      const dayNotes = await localDB.getNotesForDay(stat.date);
      for (const note of dayNotes) {
        // ✅ Добавляем ВСЕ заметки
        const id = note.id || note.filenameLink;
        localNotesMap.set(id, note);
        if (note.deleted) {
          console.log(`🗑️ Local deleted: ${id}`);
        }
      }
    }

    console.log(`☁️ Cloud notes: ${cloudNotesMap.size}, 💾 Local notes: ${localNotesMap.size}`);

    // ============================================
    // ШАГ 3: Определяем, что нужно синхронизировать
    // ============================================
    
    const allIds = new Set([...cloudNotesMap.keys(), ...localNotesMap.keys()]);
    const queueIds = new Set(queue.map((n: Note) => n.id));
    const successfullySynced: Note[] = [];

    // ============================================
    // ШАГ 4: Синхронизация (Local → Cloud)
    // ============================================
    
    for (const id of allIds) {
      const localNote = localNotesMap.get(id);
      const cloudNote = cloudNotesMap.get(id);
      
      if (queueIds.has(id)) {
        console.log(`⏭️ Skipping ${id} - in queue (local wins)`);
        continue;
      }
      
      // 🔼 Есть локально, нет в облаке → загружаем (только если не удалена)
      if (localNote && !cloudNote && !localNote.deleted) {
        console.log(`☁️ Uploading new note: ${localNote.filenameLink}`);
        await SyncManager.uploadToCloud(localDB, cloudDB, localNote);
        successfullySynced.push(localNote);
        continue;
      }
      
      // 🔽 Есть в облаке, нет локально → скачиваем (только если не удалена)
      if (cloudNote && !localNote && !cloudNote.deleted) {
        console.log(`📥 Downloading new note: ${cloudNote.filenameLink}`);
        await SyncManager.downloadFromCloud(cloudDB, localDB, cloudNote);
        continue;
      }
      
      // 🔄 Есть везде → сравниваем даты (только если не удалены)
      if (localNote && cloudNote && !localNote.deleted && !cloudNote.deleted) {
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
    // ШАГ 5: Обработка удалений
    // ============================================
    
    console.log('🗑️ Processing deletions...');
    
    // 1. Удаляем из облака то, что удалено локально
    for (const [id, localNote] of localNotesMap) {
      if (localNote.deleted && cloudNotesMap.has(id)) {
        console.log(`🗑️ Deleting from cloud: ${localNote.filenameLink}`);
        await cloudDB.deleteFile(localNote.filenameLink);
      }
    }
    
    // 2. Удаляем локально то, что удалено в облаке
    for (const [id, cloudNote] of cloudNotesMap) {
      if (cloudNote.deleted && localNotesMap.has(id)) {
        const localNote = localNotesMap.get(id);
        if (localNote && !queueIds.has(id)) {
          console.log(`🗑️ Deleting locally: ${localNote.filenameLink}`);
          await localDB.deleteFile(localNote.filenameLink);
        }
      }
    }

    // ============================================
    // ШАГ 6: Очистка очереди
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
      
      // Синхронизируем последние 6 месяцев
      for (let i = 0; i < 6; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const prefix = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
        months.add(prefix);
      }
      
      // Синхронизируем каждый месяц
      for (const month of months) {
        if (removeSyncedNotes) {
          // Если есть функция удаления - передаем пустую очередь
          await this.syncMonth(month, [], removeSyncedNotes, localDB, cloudDB);
        } else {
          // Если нет функции - синхронизируем без очистки
          await this.syncMonth(month, [], () => {}, localDB, cloudDB);
        }
      }
      
      console.log('✅ Full sync completed');
      
    } catch (error) {
      console.error('❌ Full sync failed:', error);
      throw error;
    }
  }
}