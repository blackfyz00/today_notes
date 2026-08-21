import JSZip from "jszip";
import { Note } from "@/services/Note";
import { InteractiveDoc } from "@/services/InteractiveDoc";

export class ZipPacker {
  
  /**
   * УПАКОВКА: Принимает отдельно метаданные и отдельно тело документа -> собирает в один .idoc
   */
  static async pack(note: Note, doc: InteractiveDoc): Promise<Blob> {
    const zip = new JSZip();
    let finalMarkdown = doc?.markdown || "";

    // 1. Упаковываем ассеты из InteractiveDoc
    if (doc?.assets && typeof doc.assets.entries === 'function') {
      for (const [filename, fileBlob] of doc.assets.entries()) {
        zip.file(`assets/${filename}`, fileBlob);
      }
    }

    // 2. Упаковываем markdown текст
    zip.file("index.md", finalMarkdown);

    // 3. Упаковываем метаданные из Note в meta.json
    const metaData = {
      id: note.id,
      title: note.title,
      filenameLink: note.filenameLink,
      created_at: note.created_at,
      updated_at: note.updated_at,
      pending: note.pending,
      deleted: note.deleted
    };
    zip.file("meta.json", JSON.stringify(metaData));

    return await zip.generateAsync({ type: "blob" });
  }

  /**
   * РАСПАКОВКА: Извлекает из архива ОДНОВРЕМЕННО и Note, и InteractiveDoc
   */
  static async unpack(content: Blob): Promise<{ note: Note; doc: InteractiveDoc }> {
    const zip = await JSZip.loadAsync(content); 
    const doc = new InteractiveDoc();
    
    if (!doc.assets) {
      doc.assets = new Map<string, Blob>();
    }
    
    const pathMap = new Map<string, string>();
    const assetsFolder = zip.folder("assets");

    // 1. Разбираем картинки
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

    // 2. Разбираем текст
    const mdFile = zip.file("index.md");
    if (mdFile) {
      let rawMarkdown = await mdFile.async("string");
      for (const [assetsPath, blobUrl] of pathMap.entries()) {
        const escapedPath = assetsPath.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        rawMarkdown = rawMarkdown.replace(new RegExp(escapedPath, 'g'), blobUrl);
      }
      doc.markdown = rawMarkdown;
    }

    // 3. Достаем метаданные для создания инстанса Note
    const metaFile = zip.file("meta.json");
    let meta: Partial<Note> = {};
    if (metaFile) {
      const metaString = await metaFile.async("string");
      meta = JSON.parse(metaString);
    }

    // Создаем чистый объект Note
    const note = new Note({
      id: meta.id,
      title: meta.title || "Без названия",
      filenameLink: meta.filenameLink || "unknown.idoc",
      created_at: meta.created_at,
      updated_at: meta.updated_at,
      pending: meta.pending,
      deleted: meta.deleted
    });

    // Возвращаем кортеж из двух раздельных объектов
    return { note, doc };
  }
}
