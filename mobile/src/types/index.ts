export type AppState = 'idle' | 'listening' | 'thinking' | 'done' | 'error';

export interface TranscribeResponse {
  text: string;
  isMock?: boolean;
  notice?: string;
  error?: string;
  details?: string;
}

export interface AppConfig {
  backendUrl: string;
  sharedSecret: string;
}
