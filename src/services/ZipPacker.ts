import JSZip from "jszip";
import { Note } from "@/services/Note";
import { InteractiveDoc } from "@/services/InteractiveDoc";

/**
 * Утилиты для сжатия и оптимизации мультимедиа
 */
class CompressionUtils {
  static readonly COMPRESS_LEVEL = 9;

  /**
   * Минификация Markdown
   */
  static minifyMarkdown(markdown: string): string {
    if (!markdown) return "";
    return markdown
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+$/gm, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .trim();
  }

  /**
   * Проверка поддержки WebP
   */
  static async isWebPSupported(): Promise<boolean> {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const data = canvas.toDataURL("image/webp");
      return data.startsWith("data:image/webp");
    } catch {
      return false;
    }
  }

  /**
   * ОПТИМИЗАЦИЯ ИЗОБРАЖЕНИЙ
   */
  static async optimizeImage(
    blob: Blob,
    quality: number = 0.8,
    maxWidth: number = 1600,
    maxHeight: number = 1600
  ): Promise<Blob> {
    const mimeType = blob.type;
    
    if (!mimeType.startsWith("image/")) return blob;

    if (mimeType === "image/svg+xml") {
      const text = await blob.text();
      const minified = text
        .replace(/\s+/g, " ")
        .replace(/>\s+</g, "><")
        .trim();
      return new Blob([minified], { type: "image/svg+xml" });
    }

    if (mimeType === "image/gif") {
      return blob;
    }

    try {
      const img = await createImageBitmap(blob);
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      const isPNG = mimeType === "image/png";
      let outputType: string;
      let finalQuality = quality;

      if (isPNG) {
        const hasAlpha = this.hasTransparency(canvas);
        if (hasAlpha) {
          const supportWebP = await this.isWebPSupported();
          if (supportWebP) {
            outputType = "image/webp";
          } else {
            outputType = "image/png";
            finalQuality = 1.0;
          }
        } else {
          outputType = "image/jpeg";
        }
      } else {
        outputType = "image/jpeg";
      }

      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (resultBlob) => {
            if (resultBlob) {
              resolve(resultBlob);
            } else {
              reject(new Error("Ошибка конвертации изображения"));
            }
          },
          outputType,
          finalQuality
        );
      });
    } catch (error) {
      console.warn("Не удалось оптимизировать изображение, использую оригинал", error);
      return blob;
    }
  }

  private static hasTransparency(canvas: HTMLCanvasElement): boolean {
    const ctx = canvas.getContext("2d")!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    const step = Math.max(1, Math.floor(data.length / 10000));
    for (let i = 3; i < data.length; i += 4 * step) {
      if (data[i] < 255) {
        return true;
      }
    }
    return false;
  }

  /**
   * ОПТИМИЗАЦИЯ АУДИО
   */
  static async optimizeAudio(
    blob: Blob,
    normalize: boolean = true,
    trimSilence: boolean = true
  ): Promise<Blob> {
    const mimeType = blob.type;
    
    if (!mimeType.startsWith("audio/")) return blob;
    if ((mimeType === "audio/mpeg" || mimeType === "audio/mp4") && blob.size < 300 * 1024) {
      return blob;
    }

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await blob.arrayBuffer();
      let audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      if (normalize) {
        audioBuffer = await this.normalizeAudio(audioBuffer);
      }

      if (trimSilence) {
        audioBuffer = await this.trimSilence(audioBuffer);
      }

      const wavBlob = await this.encodeToWAV(audioBuffer);
      await audioContext.close();
      
      return wavBlob.size < blob.size ? wavBlob : blob;
    } catch (error) {
      console.warn("Не удалось оптимизировать аудио, использую оригинал", error);
      return blob;
    }
  }

  private static async normalizeAudio(buffer: AudioBuffer): Promise<AudioBuffer> {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const numberOfChannels = buffer.numberOfChannels;
    const length = buffer.length;
    const sampleRate = buffer.sampleRate;
    
    let peak = 0;
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const abs = Math.abs(channelData[i]);
        if (abs > peak) peak = abs;
      }
    }
    
    const targetPeak = 0.9;
    const gain = peak > 0 ? Math.min(targetPeak / peak, 2.0) : 1.0;
    
    if (gain === 1.0) return buffer;
    
    const newBuffer = audioContext.createBuffer(numberOfChannels, length, sampleRate);
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sourceData = buffer.getChannelData(channel);
      const destData = newBuffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        destData[i] = sourceData[i] * gain;
      }
    }
    
    return newBuffer;
  }

  private static async trimSilence(buffer: AudioBuffer): Promise<AudioBuffer> {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const threshold = 0.005;
    const numberOfChannels = buffer.numberOfChannels;
    const length = buffer.length;
    
    let start = 0;
    let end = length - 1;
    
    for (let i = 0; i < length; i++) {
      let isSilent = true;
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.abs(buffer.getChannelData(channel)[i]);
        if (sample > threshold) {
          isSilent = false;
          break;
        }
      }
      if (!isSilent) {
        start = Math.max(0, i - 500);
        break;
      }
    }
    
    for (let i = length - 1; i >= 0; i--) {
      let isSilent = true;
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.abs(buffer.getChannelData(channel)[i]);
        if (sample > threshold) {
          isSilent = false;
          break;
        }
      }
      if (!isSilent) {
        end = Math.min(length - 1, i + 500);
        break;
      }
    }
    
    if (start === 0 && end === length - 1) return buffer;
    if (end - start < 100) return buffer;
    
    const trimmedLength = end - start + 1;
    const newBuffer = audioContext.createBuffer(
      numberOfChannels,
      trimmedLength,
      buffer.sampleRate
    );
    
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sourceData = buffer.getChannelData(channel);
      const destData = newBuffer.getChannelData(channel);
      for (let i = 0; i < trimmedLength; i++) {
        destData[i] = sourceData[i + start];
      }
    }
    
    return newBuffer;
  }

  private static async encodeToWAV(buffer: AudioBuffer): Promise<Blob> {
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const length = buffer.length;
    
    const pcmData = new Int16Array(length * numberOfChannels);
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const sample = Math.max(-1, Math.min(1, channelData[i]));
        pcmData[i * numberOfChannels + channel] = Math.round(sample * 32767);
      }
    }
    
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    const dataLength = pcmData.length * 2;
    
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);
    
    return new Blob([header, pcmData.buffer], { type: 'audio/wav' });
  }

  private static writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}

export class ZipPacker {
  
  static async pack(note: Note, doc: InteractiveDoc): Promise<Blob> {
    const zip = new JSZip();

    const zipOptions = {
      compression: "DEFLATE" as const,
      compressionOptions: { level: CompressionUtils.COMPRESS_LEVEL },
    };

    // 1. ОПТИМИЗАЦИЯ АССЕТОВ
    if (doc?.assets && typeof doc.assets.entries === "function") {
      const assetPromises: Promise<[string, Blob]>[] = [];
      
      for (const [filename, blob] of doc.assets.entries()) {
        const mimeType = blob.type;
        
        let optimizePromise: Promise<Blob>;
        
        // ОПТИМИЗАЦИЯ ИЗОБРАЖЕНИЙ (> 30KB)
        if (mimeType.startsWith("image/") && blob.size > 30 * 1024) {
          const quality = blob.size > 1024 * 1024 ? 0.7 : 0.8;
          optimizePromise = CompressionUtils.optimizeImage(blob, quality, 1600, 1600);
        }
        // ОПТИМИЗАЦИЯ АУДИО (> 200KB)
        else if (mimeType.startsWith("audio/") && blob.size > 200 * 1024) {
          optimizePromise = CompressionUtils.optimizeAudio(blob, true, true);
        }
        // Остальные файлы пропускаем
        else {
          optimizePromise = Promise.resolve(blob);
        }
        
        assetPromises.push(
          optimizePromise.then(optimizedBlob => [filename, optimizedBlob] as [string, Blob])
        );
      }
      
      const optimizedAssets = await Promise.all(assetPromises);
      for (const [filename, optimizedBlob] of optimizedAssets) {
        zip.file(`assets/${filename}`, optimizedBlob, zipOptions);
      }
    }

    // 2. Минификация Markdown
    const rawMarkdown = doc?.markdown || "";
    const minifiedMarkdown = CompressionUtils.minifyMarkdown(rawMarkdown);
    zip.file("index.md", minifiedMarkdown, zipOptions);

    // 3. Минификация метаданных
    const metaData = {
      id: note.id,
      title: note.title,
      filenameLink: note.filenameLink || `${note.id}.idoc`,
      created_at: note.created_at,
      updated_at: note.updated_at,
      pending: note.pending,
      deleted: note.deleted,
      preview: note.preview || '',
    };
      
    zip.file("meta.json", JSON.stringify(metaData), zipOptions);
    zip.file("meta.json", JSON.stringify(metaData), zipOptions);

    // 4. Генерация архива с максимальным сжатием
    return await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: CompressionUtils.COMPRESS_LEVEL },
    });
  }

  static async unpack(content: Blob): Promise<{ note: Note; doc: InteractiveDoc }> {
    const zip = await JSZip.loadAsync(content);
    const doc = new InteractiveDoc();
    
    if (!doc.assets) {
      doc.assets = new Map<string, Blob>();
    }

    const pathMap = new Map<string, string>();
    const assetsFolder = zip.folder("assets");

    if (assetsFolder) {
      const promises: Promise<void>[] = [];
      assetsFolder.forEach((relativePath, file) => {
        if (!file.dir) {
          const promise = file.async("blob").then((blob) => {
            doc.assets.set(relativePath, blob);
            const blobUrl = URL.createObjectURL(blob);
            pathMap.set(`assets/${relativePath}`, blobUrl);
          });
          promises.push(promise);
        }
      });
      await Promise.all(promises);
    }

    const mdFile = zip.file("index.md");
    if (mdFile) {
      let rawMarkdown = await mdFile.async("string");
      for (const [assetsPath, blobUrl] of pathMap.entries()) {
        const escapedPath = assetsPath.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
        rawMarkdown = rawMarkdown.replace(new RegExp(escapedPath, "g"), blobUrl);
      }
      doc.markdown = rawMarkdown;
    }

    const metaFile = zip.file("meta.json");
    let meta: Partial<Note> = {};
    if (metaFile) {
      const metaString = await metaFile.async("string");
      meta = JSON.parse(metaString);
    }

    const note = new Note({
      id: meta.id,
      title: meta.title || "Без названия",
      filenameLink: meta.filenameLink || "unknown.idoc",
      created_at: meta.created_at,
      updated_at: meta.updated_at,
      pending: meta.pending,
      deleted: meta.deleted,
      preview: meta.preview || '',
    });

    return { note, doc };
  }
}
