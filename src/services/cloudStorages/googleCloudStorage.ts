// src/services/cloudStorages/googleCloudStorage.ts
import type { ICloudStorage } from "@/interfaces/ICloudStorage";
import type { IMonthStats } from "@/interfaces/IMonthStats";
import { Note } from "@/services/Note";
import { providers } from "@/services/AuthFactory";
import { GoogleAuthProvider } from "@/services/providers/GoogleProvider";
import { useTechnicalStore } from "@/services/TechnicalStore";

interface DriveFile {
  id: string;
  name: string;
  parents?: string[];
  createdTime?: string;
  modifiedTime?: string;
}

interface DriveFileList {
  files: DriveFile[];
  nextPageToken?: string;
}

export class GoogleCloudStorage implements ICloudStorage {
  private readonly API_BASE = "https://www.googleapis.com/drive/v3";
  private readonly FOLDER_MIME = "application/vnd.google-apps.folder";
  private readonly UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";
  private readonly OCTET_STREAM = "application/octet-stream";
  private readonly APP_FOLDER_NAME = "TodayAppData";
  private static instance: GoogleCloudStorage | null = null;
  private folderCache = new Map<string, string>();
  private lastRequest = 0;
  private readonly MIN_INTERVAL = 100;
  private rootFolderId: string | null = null;
  private provider = providers.google as GoogleAuthProvider;
    
  private constructor() {}

  static getInstance(): GoogleCloudStorage {
    if (!GoogleCloudStorage.instance) {
      GoogleCloudStorage.instance = new GoogleCloudStorage();
    }
    return GoogleCloudStorage.instance;
  }

  static resetInstance(): void {
    GoogleCloudStorage.instance?.folderCache.clear();
    GoogleCloudStorage.instance = null;
  }

  private async getOrCreateAppRoot(): Promise<string> {
  if (this.rootFolderId) {
    try {
      await this.request(`${this.API_BASE}/files/${this.rootFolderId}?fields=id`, { method: "GET" });
      return this.rootFolderId;
    } catch {
      this.rootFolderId = null;
    }
  }

  const query = `name = '${this.escape(this.APP_FOLDER_NAME)}' and mimeType = '${this.FOLDER_MIME}' and trashed = false and 'root' in parents`;
  const searchUrl = new URL(`${this.API_BASE}/files`);
  searchUrl.searchParams.append("q", query);
  searchUrl.searchParams.append("fields", "files(id)");
  searchUrl.searchParams.append("pageSize", "1");

  const response = await this.request(searchUrl.toString());
  const data: DriveFileList = await response.json();

  if (data.files?.length) {
    this.rootFolderId = data.files[0]!.id;
    return this.rootFolderId;
  }

  const metadata = {
    name: this.APP_FOLDER_NAME,
    mimeType: this.FOLDER_MIME,
    parents: ['root']  // 👈 ДОБАВИТЬ ЭТО
  };

  const createRes = await this.request(`${this.API_BASE}/files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metadata)
  });
  
  const newFolder: DriveFile = await createRes.json();
  this.rootFolderId = newFolder.id;
  console.log(`📁 Created app folder: ${this.APP_FOLDER_NAME} (${this.rootFolderId})`);
  return this.rootFolderId;
  }
  private getStore() {
      return useTechnicalStore();
    } 
  // ========== AUTH ==========
  private async getAuthToken(): Promise<string> {
      const token = await this.getStore().getValidToken();
      if (!token) {
        throw new Error('Authentication failed. Please login again.');
      }
      return token;
    }
  
// ========== HTTP ==========
private async request(url: string, options: RequestInit = {}, retry = 0): Promise<Response> {
  // Rate limiting
  const now = Date.now();
  const wait = this.MIN_INTERVAL - (now - this.lastRequest);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  this.lastRequest = Date.now();

  try {
    const token = await this.getStore().getValidToken();
    
    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${token}`);

    const response = await fetch(url, { ...options, headers });

    // ✅ Если 401 - НЕ пытаемся обновить токен, а выбрасываем ошибку
    if (response.status === 401) {
      console.log('🔄 401 ошибка - токен истек');
      throw new Error('Authentication failed. Please login again.');
    }

    // Остальная обработка...
    if (response.status === 204) {
      return new Response(null, { status: 204 });
    }

    if (response.status === 429 && retry < 3) {
      const delay = (response.headers.get("Retry-After") 
        ? parseInt(response.headers.get("Retry-After")!) * 1000 
        : Math.pow(2, retry) * 1000);
      await new Promise(r => setTimeout(r, delay));
      return this.request(url, options, retry + 1);
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = errorText;
      try {
        errorMessage = JSON.parse(errorText).error?.message || errorText;
      } catch {}
      throw new Error(`Google Drive API Error (${response.status}): ${errorMessage}`);
    }

    return response;
    
  } catch (error: any) {
    // ✅ Пробрасываем ошибку дальше
    throw error;
  }
}
  // ========== UTILITY ==========
  private escape(value: string): string {
    return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  }

  private parseFilename(filename: string): { targetDate: Date; cleanName: string } | null {
    if (filename.includes('/')) {
      const parts = filename.split('/');
      if (parts.length >= 4) {
        const year = parseInt(parts[0]!);
        const month = parseInt(parts[1]!) - 1;
        const day = parseInt(parts[2]!);
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
          return { targetDate: new Date(year, month, day), cleanName: parts.slice(3).join('/') };
        }
      }
      return null;
    }

    const match = filename.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)$/);
    if (match) {
      return {
        targetDate: new Date(parseInt(match[1]!), parseInt(match[2]!) - 1, parseInt(match[3]!)),
        cleanName: match[4]!
      };
    }

    return { targetDate: new Date(), cleanName: filename.replace(/^\/+/, "") };
  }

  private buildPath(date: Date, filename: string): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}/${month}/${day}/${filename.replace(/^\/+/, "")}`;
  }

  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const types: Record<string, string> = {
      'idoc': this.OCTET_STREAM,
      'txt': 'text/plain',
      'json': 'application/json',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'pdf': 'application/pdf'
    };
    return types[ext] || this.OCTET_STREAM;
  }

  // ========== FOLDER OPERATIONS ==========
  private async getOrCreateFolder(name: string, parentId?: string): Promise<string> {
    const cacheKey = parentId ? `${parentId}/${name}` : `root/${name}`;
    
    const cached = this.folderCache.get(cacheKey);
    if (cached) {
      try {
        await this.request(`${this.API_BASE}/files/${cached}?fields=id`, { method: "GET" });
        return cached;
      } catch (error: any) {
        if (error.message?.includes("404")) {
          this.folderCache.delete(cacheKey);
        } else {
          throw error;
        }
      }
    }

    let query = `name = '${this.escape(name)}' and mimeType = '${this.FOLDER_MIME}' and trashed = false`;
    query += parentId 
      ? ` and '${this.escape(parentId)}' in parents`
      : ` and 'root' in parents`;

    const searchUrl = new URL(`${this.API_BASE}/files`);
    searchUrl.searchParams.append("q", query);
    searchUrl.searchParams.append("fields", "files(id)");
    searchUrl.searchParams.append("pageSize", "1");

    const response = await this.request(searchUrl.toString());
    const data: DriveFileList = await response.json();

    if (data.files?.length) {
      this.folderCache.set(cacheKey, data.files[0]!.id);
      return data.files[0]!.id;
    }

    const metadata: any = { name, mimeType: this.FOLDER_MIME };
    if (parentId) metadata.parents = [parentId];

    const createRes = await this.request(`${this.API_BASE}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metadata)
    });
    
    const newFolder: DriveFile = await createRes.json();
    this.folderCache.set(cacheKey, newFolder.id);
    return newFolder.id;
  }

  private async findFolderByName(name: string, parentId?: string): Promise<string | null> {
    let query = `name = '${this.escape(name)}' and mimeType = '${this.FOLDER_MIME}' and trashed = false`;
    query += parentId 
      ? ` and '${this.escape(parentId)}' in parents`
      : ` and 'root' in parents`;

    const url = new URL(`${this.API_BASE}/files`);
    url.searchParams.append("q", query);
    url.searchParams.append("fields", "files(id)");
    url.searchParams.append("pageSize", "1");

    const response = await this.request(url.toString());
    const data: DriveFileList = await response.json();
    return data.files?.[0]?.id || null;
  }

  private async findFolderByPath(date: Date): Promise<string | null> {
  try {
    const rootId = await this.getOrCreateAppRoot();
    
    const year = date.getFullYear().toString();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    const yearId = await this.findFolderByName(year, rootId);
    if (!yearId) return null;
    
    const monthId = await this.findFolderByName(month, yearId);
    if (!monthId) return null;
    
    return await this.findFolderByName(day, monthId);
    
  } catch {
    return null;
  }
}

    private async getOrCreatePath(date: Date): Promise<string> {
    // ✅ Сначала получаем или создаем корневую папку TodayAppData
    const rootId = await this.getOrCreateAppRoot();
    
    // ✅ Затем создаем путь ВНУТРИ TodayAppData
    const year = await this.getOrCreateFolder(
        date.getFullYear().toString(),
        rootId  // 👈 Передаем rootId как parent
    );
    
    const month = await this.getOrCreateFolder(
        String(date.getMonth() + 1).padStart(2, "0"),
        year    // 👈 Передаем year как parent
    );
    
    return await this.getOrCreateFolder(
        String(date.getDate()).padStart(2, "0"),
        month   // 👈 Передаем month как parent
    );
    }

  // ========== FILE OPERATIONS ==========
  private async findFileInFolder(folderId: string, fileName: string): Promise<string | null> {
    const query = `name = '${this.escape(fileName)}' and '${this.escape(folderId)}' in parents and trashed = false`;
    const url = new URL(`${this.API_BASE}/files`);
    url.searchParams.append("q", query);
    url.searchParams.append("fields", "files(id)");
    url.searchParams.append("pageSize", "1");

    const response = await this.request(url.toString());
    const data: DriveFileList = await response.json();
    return data.files?.[0]?.id || null;
  }

  private async listFilesInFolder(folderId: string, includeDeleted: boolean = false): Promise<DriveFile[]> {
  const files: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    // ✅ Просто берем все файлы .idoc (включая .deleted)
    const query = `'${this.escape(folderId)}' in parents and trashed = false and name contains 'idoc'`;

    const url = new URL(`${this.API_BASE}/files`);
    url.searchParams.append("q", query);
    url.searchParams.append("fields", "files(id,name,createdTime,modifiedTime,size),nextPageToken");
    url.searchParams.append("pageSize", "1000");

    if (pageToken) url.searchParams.append("pageToken", pageToken);

    const response = await this.request(url.toString());
    const data: DriveFileList = await response.json();
    
    if (data.files) {
      // ✅ Фильтруем в JavaScript, а не в запросе
      const filtered = data.files.filter(f => {
        if (!f.name.includes('.idoc')) return false;
        return true; // берем все .idoc файлы
      });
      files.push(...filtered);
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return files;
}

  private async listFolders(parentId: string): Promise<DriveFile[]> {
    const folders: DriveFile[] = [];
    let pageToken: string | undefined;

    do {
      const query = `'${this.escape(parentId)}' in parents and mimeType = '${this.FOLDER_MIME}' and trashed = false`;
      const url = new URL(`${this.API_BASE}/files`);
      url.searchParams.append("q", query);
      url.searchParams.append("fields", "files(id,name),nextPageToken");
      url.searchParams.append("pageSize", "31");

      if (pageToken) url.searchParams.append("pageToken", pageToken);

      const response = await this.request(url.toString());
      const data: DriveFileList = await response.json();
      
      if (data.files) folders.push(...data.files);
      pageToken = data.nextPageToken;
    } while (pageToken);

    return folders;
  }

  // ========== ICloudStorage IMPLEMENTATION ==========
  async getFile(filename: string): Promise<Blob | null> {
    try {
      const parsed = this.parseFilename(filename);
      if (!parsed) return null;

      const folderId = await this.findFolderByPath(parsed.targetDate);
      if (!folderId) return null;

      const fileId = await this.findFileInFolder(folderId, parsed.cleanName);
      if (!fileId) return null;

      const response = await this.request(`${this.API_BASE}/files/${fileId}?alt=media`);
      return await response.blob();
    } catch (error) {
      console.error(`Error reading file "${filename}":`, error);
      return null;
    }
  }

    private buildMultipartBody(
        boundary: string,
        metadata: any,
        content: Blob
        ): Blob {
        // ✅ Правильный формат multipart/related
        const parts: BlobPart[] = [];
        
        // 1. JSON часть с метаданными
        parts.push(`--${boundary}\r\n`);
        parts.push('Content-Type: application/json; charset=UTF-8\r\n');
        parts.push('\r\n'); // ← ВАЖНО: пустая строка перед JSON
        parts.push(JSON.stringify(metadata));
        parts.push('\r\n');
        
        // 2. Бинарная часть с файлом
        parts.push(`--${boundary}\r\n`);
        parts.push(`Content-Type: application/octet-stream\r\n`);
        parts.push('Content-Transfer-Encoding: binary\r\n');
        parts.push('\r\n'); // ← ВАЖНО: пустая строка перед бинарными данными
        parts.push(content);
        parts.push('\r\n');
        
        // 3. Закрывающий boundary
        parts.push(`--${boundary}--\r\n`);
        
        return new Blob(parts);
        }

  async saveFile(
    filename: string,
    content: Blob,
    metadata: Record<string, string>
  ): Promise<string> {
    // ✅ Проверяем содержимое
    if (!content || content.size === 0) {
      throw new Error(`Content is empty for ${filename}`);
    }

    const parsed = this.parseFilename(filename);
    if (!parsed) throw new Error(`Invalid filename: ${filename}`);

    const { targetDate, cleanName } = parsed;
    
    // ✅ Создаем путь: TodayAppData/2026/07/09/
    const folderId = await this.getOrCreatePath(targetDate);
    const existingFileId = await this.findFileInFolder(folderId, cleanName);

    // Преобразуем метаданные в строки
    const stringMetadata: Record<string, string> = {};
    for (const [key, value] of Object.entries(metadata)) {
      stringMetadata[key] = String(value);
    }

    const fileMetadata = {
      name: cleanName,
      mimeType: "application/octet-stream",
      parents: [folderId],
      properties: stringMetadata
    };

    let fileId: string;

    if (existingFileId) {
      fileId = existingFileId;
      
      // Обновляем только метаданные существующего файла
      await this.request(
        `${this.API_BASE}/files/${fileId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: cleanName,
            properties: stringMetadata
          })
        }
      );
    } else {
      // Создаем пустой файл с метаданными
      const createResponse = await this.request(
        `${this.API_BASE}/files`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fileMetadata)
        }
      );
      const data = await createResponse.json();
      fileId = data.id;
      
      console.log('✅ File created:', fileId);
    }

    // ✅ ЗАГРУЖАЕМ СОДЕРЖИМОЕ
    console.log(`📤 Uploading ${content.size} bytes...`);
    
    const uploadResponse = await this.request(
      `${this.UPLOAD_BASE}/files/${fileId}?uploadType=media`,
      {
        method: "PATCH",
        headers: {
          'Content-Type': 'application/octet-stream'
        },
        body: content
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Upload failed:', errorText);
      throw new Error(`Upload failed: ${errorText}`);
    }

    console.log('✅ Content uploaded successfully');

    const fullPath = this.buildPath(targetDate, cleanName);
    return fullPath;
}

// src/services/cloudStorages/googleCloudStorage.ts

async deleteFile(filename: string): Promise<void> {
  console.log(`🔴🔴🔴 deleteFile CALLED with: ${filename}`); 
  
  if (filename.includes('.deleted')) {
    console.log(`⏭️ Already deleted: ${filename}`);
    return;
  }

  const parsed = this.parseFilename(filename);
  if (!parsed) {
    console.error(`❌ Invalid filename: ${filename}`);
    return;
  }

  const folderId = await this.findFolderByPath(parsed.targetDate);
  if (!folderId) {
    console.error(`❌ Folder not found for: ${parsed.targetDate}`);
    return;
  }

  const fileId = await this.findFileInFolder(folderId, parsed.cleanName);
  if (!fileId) {
    console.error(`❌ File not found: ${parsed.cleanName}`);
    return;
  }

  // ✅ Устанавливаем время удаления (то же, что будет в локальном updated_at)
  const now = new Date().toISOString();

  // ✅ Обновляем имя, modifiedTime и properties
  const response = await this.request(
    `${this.API_BASE}/files/${fileId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${parsed.cleanName}.deleted`,
        modifiedTime: now,  
        properties: {
          deleted: "true",
          updated_at: now  
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Failed to rename file: ${errorText}`);
    throw new Error(`Failed to rename file: ${errorText}`);
  }

  console.log(`✅ File renamed to: ${parsed.cleanName}.deleted (modifiedTime: ${now})`);
}
    
async getNotesForDay(day: Date): Promise<Note[]> {
  const folderId = await this.findFolderByPath(day);
  if (!folderId) return [];

  // ✅ Получаем ВСЕ .idoc файлы
  const files = await this.listFilesInFolder(folderId, true);
  const notes: Note[] = [];

  for (const file of files) {
    const isDeleted = file.name.includes('.deleted');
    const cleanName = file.name.replace(/\.deleted$/, '');
    const noteId = cleanName.replace(/\.idoc$/, "");
    const fullPath = this.buildPath(day, cleanName);

    // ✅ Если файл удален - создаем заметку с deleted: true
    if (isDeleted) {
      notes.push(new Note({
        id: noteId,
        title: `Note (${noteId})`,
        filenameLink: fullPath,
        created_at: file.createdTime || day.toISOString(),
        updated_at: file.modifiedTime || day.toISOString(),
        deleted: true
      }));
      console.log(`🗑️ Found deleted file: ${file.name}`);
      continue;
    }

    // ... остальной код для обычных файлов
    let title = `Note (${noteId})`;
    let createdAt = file.createdTime || day.toISOString();
    let updatedAt = file.modifiedTime || day.toISOString();

    try {
      const response = await this.request(`${this.API_BASE}/files/${file.id}?alt=media`);
      const blob = await response.blob();
      
      if (blob && blob.size > 0) {
        try {
          const { ZipPacker } = await import("@/services/ZipPacker");
          const { note } = await ZipPacker.unpack(blob);
          if (note) {
            title = note.title || title;
            createdAt = note.created_at || createdAt;
            updatedAt = note.updated_at || updatedAt;
          }
        } catch {
          // Используем метаданные
        }
      }
    } catch (error) {
      console.warn(`Cannot read file ${file.name}:`, error);
    }

    notes.push(new Note({
      id: noteId,
      title,
      filenameLink: fullPath,
      created_at: createdAt,
      updated_at: updatedAt,
      deleted: false
    }));
  }

  return notes;
}
    
  async getMonthStats(month: Date): Promise<IMonthStats[]> {
  const year = month.getFullYear();
  const monthStr = String(month.getMonth() + 1).padStart(2, "0");

  try {
    const rootId = await this.getOrCreateAppRoot();
    const yearId = await this.findFolderByName(year.toString(), rootId);
    if (!yearId) return [];

    const monthId = await this.findFolderByName(monthStr, yearId);
    if (!monthId) return [];

    const dayFolders = await this.listFolders(monthId);
    if (!dayFolders.length) return [];

    // ✅ Считаем ВСЕ .idoc файлы (включая .deleted)
    const fileArrays = await Promise.all(
      dayFolders.map(f => this.listFilesInFolder(f.id, true))
    );

    return dayFolders
      .map((folder, i) => {
        const dayNum = parseInt(folder.name);
        if (isNaN(dayNum)) return null;
        return {
          date: new Date(year, month.getMonth(), dayNum),
          totalNotes: fileArrays[i]!.filter(f => f.name.includes('.idoc')).length
        };
      })
      .filter((stat): stat is IMonthStats => stat !== null)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
      
  } catch (error) {
    console.error("Error getting month stats:", error);
    return [];
  }
}
}

export const GoogleCloud = GoogleCloudStorage.getInstance();