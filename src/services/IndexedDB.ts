// src/services/IndexedDB.ts
import { openDB, type IDBPDatabase } from "idb";
import type { ICloudStorage } from "@/interfaces/ICloudStorage";
import type { IMonthStats } from "@/interfaces/IMonthStats"; 
import { Note } from "@/services/Note";

class IndexedDB implements ICloudStorage {
  private dbName = "app_cloud_storage";
  private dbVersion = 1;
  private dbPromise: Promise<IDBPDatabase> | null = null;
  
  private static instance: IndexedDB | null = null;

  private constructor() {
    this.initDB();
  }

  public static getInstance(): IndexedDB {
    if (!IndexedDB.instance) {
      IndexedDB.instance = new IndexedDB();
    }
    return IndexedDB.instance;
  }

  private initDB(): Promise<IDBPDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = openDB(this.dbName, this.dbVersion, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("files")) {
          db.createObjectStore("files");
        }
      },
    });

    return this.dbPromise;
  }

  // ==================== UTILITY METHODS ====================

  private buildPartitionPath(date: Date, filename: string): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const cleanFilename = filename.replace(/^\/+/, "");
    return `${year}/${month}/${day}/${cleanFilename}`;
  }

  private parseFilename(filename: string): { targetDate: Date; cleanName: string } | null {
  // Format 1: Full path with slashes
  if (filename.includes('/')) {
    const parts = filename.split('/');
    if (parts.length >= 4) {
      const yearStr = parts[0] || "";
      const monthStr = parts[1] || "";
      const dayStr = parts[2] || "";
      const name = parts.slice(3).join('/');
      
      const year = parseInt(yearStr);
      const month = parseInt(monthStr) - 1;
      const day = parseInt(dayStr);
      
      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        return null;
      }
      
      return {
        targetDate: new Date(year, month, day),
        cleanName: name
      };
    }
    return null;
  }
  
  // Format 2: Dated filename (YYYY-MM-DD-name)
  const dateMatch = filename.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)$/);
  
  // ✅ ИСПРАВЛЕНО: Проверяем dateMatch на существование и берем элементы безопасно
  if (dateMatch && dateMatch[1] && dateMatch[2] && dateMatch[3] && dateMatch[4]) {
    const yearStr = dateMatch[1];
    const monthStr = dateMatch[2];
    const dayStr = dateMatch[3];
    const name = dateMatch[4];
    
    return {
      targetDate: new Date(
        parseInt(yearStr), 
        parseInt(monthStr) - 1, 
        parseInt(dayStr)
      ),
      cleanName: name
    };
  }
  
  // Default: use today's date
  return {
    targetDate: new Date(),
    cleanName: filename.replace(/^\/+/, "")
  };
}

  // ==================== ICloudStorage IMPLEMENTATION ====================

  async getFile(filename: string): Promise<Blob | null> {
    const db = await this.initDB();
    try {
      let actualKey = filename;
      
      if (!filename.includes('/')) {
        const parsed = this.parseFilename(filename);
        if (parsed) {
          // Пересобираем в правильный формат: YYYY/MM/DD/cleanName
          actualKey = this.buildPartitionPath(parsed.targetDate, parsed.cleanName);
        }
      }

      // Теперь в actualKey гарантированно лежит путь со слэшами, как на вашем скриншоте
      const result = await db.get("files", actualKey);
      return (result as Blob) || null;
      
    } catch (error) {
      console.error(`Ошибка чтения файла ${filename} из IndexedDB:`, error);
      throw error;
    }
  }

  async saveFile(filename: string, content: Blob | string): Promise<string> { // 👈 Меняем возвращаемый тип на Promise<string>
    const db = await this.initDB();
    
    const parsed = this.parseFilename(filename);
    let targetDate = new Date();
    let cleanName = filename;

    if (parsed) {
      targetDate = parsed.targetDate;
      cleanName = parsed.cleanName;
    } else {
      cleanName = filename.replace(/^\/+/, "");
    }

    const partitionedPath = this.buildPartitionPath(targetDate, cleanName);
    
    await db.put("files", content, partitionedPath);
    console.debug(`Saved file to IndexedDB: ${partitionedPath}`);
    
    return partitionedPath; 
  }


  async deleteFile(filename: string): Promise<void> {
    if (filename.includes('.deleted')) {
      console.debug(`File already in trash: ${filename}`);
      return;
    }
    const db = await this.initDB();
    const parsed = this.parseFilename(filename);
    if (!parsed) {
      console.error(`Invalid filename format: ${filename}`);
      return;
    }
  
    const oldPath = this.buildPartitionPath(parsed.targetDate, parsed.cleanName);
    const newPath = `${oldPath}.deleted`;
  
    const blob = await db.get("files", oldPath);
    if (!blob) {
      console.warn(`File not found: ${oldPath}`);
      return;
    }
  
    // Переносим blob как есть: без unpack/repack — мгновенно и без потери данных
    await db.put("files", blob, newPath);
    await db.delete("files", oldPath);
    console.debug(`Moved file to trash: ${oldPath} -> ${newPath}`);
  }
  // src/services/IndexedDB.ts
  
  async getNotesForDay(day: Date): Promise<Note[]> {
    const db = await this.initDB();
    const year = day.getFullYear();
    const month = String(day.getMonth() + 1).padStart(2, "0");
    const date = String(day.getDate()).padStart(2, "0");
    const dayPrefix = `${year}/${month}/${date}/`;
    const range = IDBKeyRange.bound(dayPrefix, dayPrefix + "\uffff");
  
    // Только ключи — не держим все blob'ы в памяти
    const keys = (await db.getAllKeys("files", range)) as string[];
  
    const { ZipPacker } = await import("@/services/ZipPacker");
    const notes: Note[] = [];
  
    for (const fullPath of keys) {
      const isDeleted = fullPath.includes('.deleted');
      const cleanPath = fullPath.replace(/\.deleted$/, '');
  
      if (isDeleted) {
        const filename = fullPath.split("/").pop() || "unknown.idoc";
        notes.push(new Note({
          id: filename.replace(".idoc", ""),
          title: "Удаленная заметка",
          filenameLink: cleanPath,
          created_at: day.toISOString(),
          deleted: true,
          preview: ""
        }));
        continue;
      }
  
      try {
        const blob = (await db.get("files", fullPath)) as Blob;
        const info = blob ? await ZipPacker.getNoteInfo(blob) : null;
  
        if (info) {
          notes.push(new Note({
            id: info.id,
            title: info.title || "Без названия",
            filenameLink: fullPath,
            created_at: info.created_at || day.toISOString(),
            updated_at: info.updated_at || day.toISOString(),
            deleted: false,
            preview: info.preview || ""
          }));
        }
      } catch (e) {
        console.error(`[IndexedDB] Ошибка чтения метаданных из ${fullPath}:`, e);
        const filename = fullPath.split("/").pop() || "unknown.idoc";
        notes.push(new Note({
          id: filename.replace(".idoc", ""),
          title: "Заметка (Файл поврежден)",
          filenameLink: fullPath,
          created_at: day.toISOString(),
          deleted: false,
          preview: ""
        }));
      }
    }
    return notes;
  }
    
  async getMonthStats(month: Date): Promise<IMonthStats[]> {
    const db = await this.initDB();

    const year = month.getFullYear();
    const monthStr = String(month.getMonth() + 1).padStart(2, "0");
    const monthPrefix = `${year}/${monthStr}/`;
    
    const range = IDBKeyRange.bound(monthPrefix, monthPrefix + "\uffff");
    const keys = await db.getAllKeys("files", range) as string[];

    const countMap = new Map<string, number>();

    for (const key of keys) {
      if (key.includes('.deleted')) {
        continue;
      }

      const parts = key.split("/");
      if (parts.length >= 4) {
        const dayKey = `${parts[0]}-${parts[1]}-${parts[2]}`;
        const currentCount = countMap.get(dayKey) || 0;
        countMap.set(dayKey, currentCount + 1);
      }
    }

    const result: IMonthStats[] = Array.from(countMap.entries()).map(([dateStr, count]) => {
      const parts = dateStr.split("-").map(Number);
      const y = parts[0] || year;
      const m = (parts[1] || 1) - 1; 
      const d = parts[2] || 1;
      
      return {
        date: new Date(y, m, d),
        totalNotes: count
      };
    });
    
    return result;
  }
}

export const LocalDB = IndexedDB.getInstance();