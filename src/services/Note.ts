export class Note {
  id?: string;
  title: string;
  filenameLink: string; 
  created_at?: string;
  updated_at?: string;
  pending?: boolean;
  deleted?: boolean;

  // Обязательные поля для создания теперь: title и filename
  constructor(init: Partial<Note> & { title: string; filenameLink: string }) {
    this.id = init.id;
    this.title = init.title;
    this.filenameLink = init.filenameLink;
    this.created_at = init.created_at || new Date().toISOString();
    this.updated_at = init.updated_at || new Date().toISOString();
    this.pending = init.pending ?? false;
    this.deleted = init.deleted ?? false;
  }
}
