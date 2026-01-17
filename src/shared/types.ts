/**
 * Shared types used across extension components
 */

export interface Config {
  areaId: string;
  authToken: string;
  goalId?: string;
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
