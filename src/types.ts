export type VocabularyCategory =
  | 'tutti'
  | 'struttura'
  | 'testo'
  | 'liste'
  | 'matematica'
  | 'tabelle'
  | 'figure'
  | 'riferimenti'
  | 'pacchetti';

export interface VocabularyItem {
  id: string;
  name: string;
  category: Exclude<VocabularyCategory, 'tutti'>;
  command: string;
  insertText: string;
  description: string;
  syntax: string;
  example: string;
  preview: string;
  keywords: string[];
}

export interface CompileError {
  line: number;
  message: string;
  file?: string;
  raw?: string;
}

export type CompileStatus = 'idle' | 'compiling' | 'success' | 'error';

export interface CompileResult {
  success: boolean;
  pdfBase64?: string;
  pdfBlobUrl?: string;
  errors: CompileError[];
  rawLog: string;
  durationMs: number;
  timestamp: number;
}

export interface UpdateInfo {
  checked: boolean;
  available: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseUrl?: string;
  releaseNotes?: string;
  installerDownloadUrl?: string;
  installerFileName?: string;
}

export interface FileState {
  path: string | null;
  name: string;
  isDirty: boolean;
  autoSave: boolean;
}
