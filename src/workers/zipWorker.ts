// src/workers/zipWorker.ts
import { ZipPacker } from '@/services/ZipPacker'
import { Note } from "@/services/Note"
import { InteractiveDoc } from "@/services/InteractiveDoc"
import { truncate } from '@/services/utilsfuncs'

self.onmessage = async (e) => {
  const { type, data } = e.data
  console.log('📥 Worker получил:', { type, dataKeys: Object.keys(data) })
  
  if (type === 'save') {
    try {
      // 1. Подготовка данных
      let markdownToPack = data.content || ""
      const cleanAssetsMap = new Map()
      
      // 🔥 data.mediaFiles теперь массив объектов { name, file, url }
      const mediaFiles = data.mediaFiles || []
      for (const entry of mediaFiles) {
        const { name, file, url } = entry
        if (file) {
          cleanAssetsMap.set(name, file)   // file – это Blob (уже передан через transfer)
        }
        if (url) {
          markdownToPack = markdownToPack.replaceAll(url, `assets/${name}`)
        }
      }
      
      // 2. Создаём InteractiveDoc
      const docToPack = new InteractiveDoc({ 
        markdown: markdownToPack, 
        assets: cleanAssetsMap 
      })
      
      // 3. Создаём Note
      const noteId = data.noteId || crypto.randomUUID()
      // 🔥 Безопасно обрабатываем дату
      const dateObj = data.selectedDate ? new Date(data.selectedDate) : new Date()
      const year = dateObj.getFullYear()
      const month = String(dateObj.getMonth() + 1).padStart(2, "0")
      const day = String(dateObj.getDate()).padStart(2, "0")
      const dateKey = `${year}-${month}-${day}`
      const initialFilename = `${dateKey}-${noteId}.idoc`
      const previewText = truncate(data.content, 120)
      
      const tempNote = new Note({
        id: noteId,
        title: data.title,
        filenameLink: initialFilename,
        created_at: data.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        preview: previewText
      })
      
      // 4. Упаковка (тяжёлая операция)
      const zipBlob = await ZipPacker.pack(tempNote, docToPack)
      
      // 5. Отправляем результат
      self.postMessage({ 
        type: 'done', 
        data: { 
          zipBlob, 
          noteData: tempNote,
          initialFilename 
        } 
      })
      
    } catch (error) {
      self.postMessage({ 
        type: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    }
  }
}