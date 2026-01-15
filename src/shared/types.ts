/**
 * Shared types used across extension components
 */

export interface Credentials {
  areaId: string;
  authToken: string;
}

export interface TaskResponse {
  status: number;
  data?: unknown;
  error?: string;
}

export interface ExtractedContent {
  title: string;
  content: string;
  url: string;
}

export type SaveMode = "url" | "content";
