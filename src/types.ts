export const DEFAULT_RULES = [
    'node_modules/',
    'dist/',
    '.next/',
    '.cache/',
    '.DS_Store',
    ...(process.platform === 'win32' ? ['Thumbs.db'] : []),
].join('\n');

export type BatchAction = 'hide' | 'show';
export type BatchStatus = 'running' | 'completed' | 'rolled-back' | 'rolled-back-partial' | 'failed';

export interface FileIdentity {
    dev: number;
    ino: number;
    size: number;
    mtimeMs: number;
    isDirectory: boolean;
}

export interface FileOperation {
    oldPath: string;
    newPath: string;
    timestamp: number;
    identity?: FileIdentity;
}

export interface RollbackResult {
    restored: number;
    skippedMissing: number;
}

export interface PersistedBatchRecord {
    id: string;
    action: BatchAction;
    createdAt: number;
    updatedAt: number;
    rulesText: string;
    plannedCount: number;
    skippedProtected: number;
    skippedNested: number;
    skippedConflicts: number;
    completed: FileOperation[];
    pending: FileOperation[];
    status: BatchStatus;
    lastError?: string;
}

export interface FileIgnoreSettings {
    rules: string;
    ignoredFiles: string[];
    debug: boolean;
    rulesHistory: string[];
    lastBatch?: PersistedBatchRecord | null;
}

export const DEFAULT_SETTINGS: FileIgnoreSettings = {
    rules: DEFAULT_RULES,
    ignoredFiles: [],
    debug: false,
    rulesHistory: [],
    lastBatch: null,
};
