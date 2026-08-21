import type { Note } from "@/services/Note";
import type { InteractiveDoc } from "@/services/InteractiveDoc";

export interface IPacker {
  // Принимает чистую Note (где content — это ZIP Blob) и превращает в InteractiveDoc
  unpack(note: Note): Promise<InteractiveDoc>;
  
  // Принимает InteractiveDoc (текст + ассеты), упаковывает в ZIP Blob и обновляет/возвращает Note
  pack(doc: InteractiveDoc, baseNote: Note): Promise<Note>;
}
