/**
 * Shared types used across extension components
 */

export interface Credentials {
  userId: string;
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

export interface ExtensionSettings {
  saveMode: SaveMode;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  saveMode: "url",
};
