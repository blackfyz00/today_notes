// src/services/ZipPacker.ts
import JSZip from 'jszip'
import { Note } from './Note'
import { InteractiveDoc } from './InteractiveDoc'

// Константы
const MAX_IMAGE_DIMENSION = 1920          // Макс. сторона после даунскейла
const MAX_IMAGE_BYTES = 5 * 1024 * 1024   // Сжимаем изображения больше этого
const MAX_ASSET_BYTES = 20 * 1024 * 1024  // Пропускаем ассеты больше этого при unpack
const MAX_ASSETS = 50                     // Лимит ассетов на заметку

export class ZipPacker {
  /**
   * Упаковка: ассеты оптимизируются и хранятся как есть (STORE),
   * текст сжимается DEFLATE.
   */
  static async pack(note: Note, doc: InteractiveDoc): Promise<Blob> {
    const zip = new JSZip()

    // 1. Ассеты
    if (doc.assets && doc.assets.size > 0) {
      for (const [name, asset] of Array.from(doc.assets.entries())) {
        if (asset instanceof Blob && asset.size > 0) {
          const optimized = await this.optimizeImage(asset)
          zip.file(`assets/${name}`, optimized, { compression: 'STORE' })
        }
      }
    }

    // 2. note.json — единственный источник метаданных
    const noteJSON = JSON.stringify(note.toJSON ? note.toJSON() : note)
    zip.file('note.json', noteJSON, {
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    })

    // 3. content.md
    if (doc.markdown) {
      zip.file('content.md', doc.markdown, {
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      })
    }

    // 4. Генерация (глобальный DEFLATE применяется только к тексту,
    //    т.к. у ассетов явно указан STORE)
    return zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
      streamFiles: true
    })
  }

  /**
   * Полная распаковка (для редактирования). Ассеты возвращаются как есть,
   * без повторного сжатия.
   */
  static async unpack(zipBlob: Blob): Promise<{ note: Note; doc: InteractiveDoc }> {
    const zip = await JSZip.loadAsync(zipBlob)

    let noteData: any = null
    const noteFile = zip.file('note.json')
    if (noteFile) {
      noteData = JSON.parse(await noteFile.async('string'))
    }

    let markdown = ''
    const contentFile = zip.file('content.md')
    if (contentFile) {
      markdown = await contentFile.async('string')
    }

    const assetsMap = new Map<string, Blob>()
    const assetFiles = zip
      .filter((path) => path.startsWith('assets/') && !path.endsWith('/'))
      .slice(0, MAX_ASSETS)

    for (const file of assetFiles) {
      try {
        const uncompressedSize = (file as any)._data?.uncompressedSize as number | undefined
        if (uncompressedSize && uncompressedSize > MAX_ASSET_BYTES) {
          console.warn(`Skipping large asset: ${file.name}`)
          continue
        }
        const name = file.name.replace('assets/', '')
        assetsMap.set(name, await file.async('blob'))
      } catch (e) {
        console.warn(`Failed to load asset ${file.name}:`, e)
      }
    }

    return {
      note: new Note(noteData || {}),
      doc: new InteractiveDoc({ markdown, assets: assetsMap })
    }
  }

  /**
   * Лёгкое чтение ТОЛЬКО note.json — для списков.
   * Ассеты не трогаем вообще.
   */
  static async getNoteInfo(zipBlob: Blob): Promise<any | null> {
    try {
      const zip = await JSZip.loadAsync(zipBlob)
      const noteFile = zip.file('note.json')
      if (!noteFile) return null
      return JSON.parse(await noteFile.async('string'))
    } catch (e) {
      console.error('Error reading note.json:', e)
      return null
    }
  }

  /**
   * Сжатие больших изображений. Работает и в Worker, и в main thread
   * (createImageBitmap + OffscreenCanvas). При любой ошибке — оригинал.
   */
  private static async optimizeImage(blob: Blob): Promise<Blob> {
    if (!blob.type.startsWith('image/')) return blob
    if (blob.size <= MAX_IMAGE_BYTES) return blob
    if (blob.type === 'image/gif' || blob.type === 'image/svg+xml') return blob

    try {
      const bitmap = await createImageBitmap(blob)
      let { width, height } = bitmap

      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        const ratio = Math.min(MAX_IMAGE_DIMENSION / width, MAX_IMAGE_DIMENSION / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = new OffscreenCanvas(width, height)
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        bitmap.close()
        return blob
      }

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(bitmap, 0, 0, width, height)
      bitmap.close()

      const compressed = await canvas.convertToBlob({
        type: 'image/jpeg',
        quality: 0.8
      })

      // Если сжатие дало больший размер — оставляем оригинал
      return compressed.size < blob.size ? compressed : blob
    } catch (e) {
      console.warn('Image optimization failed, keeping original:', e)
      return blob
    }
  }
}
