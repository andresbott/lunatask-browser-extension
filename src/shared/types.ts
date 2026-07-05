/**
 * Shared types used across extension components
 */

export interface Config {
  areaId: string;
  authToken: string;
  goalId?: string;
  notebookId?: string;
}

export interface TaskResponse {
  status: number;
  data?: unknown;
  error?: string;
}

export interface NoteResponse {
  status: number;
  noteId?: string;
  error?: string;
}

export interface ExtractedContent {
  title: string;
  content: string;
  url: string;
}

export type SaveAction =
  | { source: "page-url" | "link"; target: "task" }
  | {
      source: "page" | "selection";
      target: "task" | "note" | "note-with-task";
    };

export type SaveMode = "url" | "content";
