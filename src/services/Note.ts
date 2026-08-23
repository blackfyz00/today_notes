// src/services/Note.ts
export class Note {
  id: string;
  title: string;
  filenameLink: string;
  created_at: string;
  updated_at: string;
  pending?: boolean;
  deleted?: boolean;
  preview?: string;

  constructor(data: {
    id: string;
    title: string;
    filenameLink: string;
    created_at?: string;
    updated_at?: string;
    pending?: boolean;
    deleted?: boolean;
    preview?: string; 
  }) {
    this.id = data.id;
    this.title = data.title;
    this.filenameLink = data.filenameLink;
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || new Date().toISOString();
    this.pending = data.pending || false;
    this.deleted = data.deleted || false;
    this.preview = data.preview || ''; 
  }
}