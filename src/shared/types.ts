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
