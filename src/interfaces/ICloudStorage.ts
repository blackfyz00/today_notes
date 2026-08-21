import type { IMonthStats } from "./IMonthStats";
import {Note} from "@/services/Note"

// Этот же интерфейс на локальную БД
export interface ICloudStorage {
  saveFile(filename: string, content: Blob | string, metadata?: Record<string, string>): Promise<string>;
  deleteFile(filename: string): Promise<void>;
  getMonthStats(month: Date): Promise<IMonthStats[]>;
  getNotesForDay(day: Date): Promise<Note[]>;
  getFile(filename: string): Promise<Blob | null>;
}
