export class InteractiveDoc {
  // Текст заметки в формате Markdown
  public markdown: string;
  
  // Карта медиафайлов: "имя_файла.png" -> Blob-объект файла
  public assets: Map<string, Blob>;

  constructor(init?: Partial<InteractiveDoc>) {
    this.markdown = init?.markdown ?? "";
    this.assets = init?.assets ?? new Map();
  }
}
