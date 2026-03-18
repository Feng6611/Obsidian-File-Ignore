import { TAbstractFile, TFile, TFolder, Vault } from 'obsidian';
import minimatch from 'minimatch';
import { LocalFileSystem, FileInfo } from './localFileSystem';
import path from 'path';
import fs from 'fs';
import type { BatchAction, FileOperation, PersistedBatchRecord } from './types';

interface FileSystemAdapterExtended {
    getBasePath(): string;
    rename?(oldPath: string, newPath: string): Promise<void>;
}

export interface Rule {
    pattern: string;
    negate: boolean;
}

export interface RenamePlanItem {
    oldPath: string;
    newPath: string;
    isDirectory: boolean;
    oldName: string;
    newName: string;
}

export interface RenamePlanConflict {
    oldPath: string;
    newPath: string;
    reason: 'protected' | 'target-exists' | 'duplicate-target' | 'nested-under-directory';
}

export interface RenamePlan {
    action: BatchAction;
    requestedCount: number;
    noopCount: number;
    skippedProtected: number;
    skippedNested: number;
    skippedConflicts: number;
    items: RenamePlanItem[];
    conflicts: RenamePlanConflict[];
}

interface RenameResult {
    success: boolean;
    changed: boolean;
    error?: string;
}

export class FileOperations {
    private vault: Vault;
    private localFs: LocalFileSystem;
    private operations: FileOperation[] = [];
    private DEBUG = false;
    private fileCache: { items: FileInfo[]; timestamp: number } | null = null;
    private static CACHE_TTL = 2000;
    private static PROTECTED_PREFIXES = [
        '.obsidian',
        '.git',
        '.trash',
    ];

    constructor(vault: Vault) {
        this.vault = vault;
        const adapter = this.vault.adapter as unknown as FileSystemAdapterExtended;
        this.localFs = new LocalFileSystem(adapter.getBasePath());
    }

    setDebug(enabled: boolean) {
        this.DEBUG = enabled;
    }

    private debug(...args: any[]) {
        if (this.DEBUG) {
            console.debug('[file-ignore]', ...args);
        }
    }

    private audit(level: 'info' | 'warn' | 'error', message: string, context?: Record<string, any>) {
        const payload = context ? ['[file-ignore][audit]', message, context] : ['[file-ignore][audit]', message];
        switch (level) {
            case 'warn':
                console.warn(...payload);
                break;
            case 'error':
                console.error(...payload);
                break;
            default:
                console.info(...payload);
                break;
        }
    }

    parseRules(rulesText: string): Rule[] {
        return rulesText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'))
            .map(pattern => ({
                pattern: pattern.startsWith('!') ? pattern.slice(1) : pattern,
                negate: pattern.startsWith('!')
            }));
    }

    private normalizePath(relPath: string): string {
        return relPath.replace(/\\/g, '/').replace(/^\.\//, '');
    }

    private getAllFilesRecursively(currentPath: string = ''): FileInfo[] {
        if (currentPath === '' && this.fileCache && (Date.now() - this.fileCache.timestamp) < FileOperations.CACHE_TTL) {
            return this.fileCache.items;
        }

        const items = this.localFs.getAllFiles(currentPath);

        if (currentPath === '') {
            this.fileCache = { items, timestamp: Date.now() };
        }

        return items;
    }

    public isProtectedPath(relPath: string): boolean {
        const normalized = this.normalizePath(relPath);
        const top = normalized.split('/')[0];
        return FileOperations.PROTECTED_PREFIXES.includes(top);
    }

    public isHiddenPath(relPath: string): boolean {
        return path.basename(this.normalizePath(relPath)).startsWith('.');
    }

    private isHideTransition(oldPath: string, newPath: string): boolean {
        return !this.isHiddenPath(oldPath) && this.isHiddenPath(newPath);
    }

    private isShowTransition(oldPath: string, newPath: string): boolean {
        return this.isHiddenPath(oldPath) && !this.isHiddenPath(newPath);
    }

    private findPendingShowTarget(currentPath: string, persistedBatch?: PersistedBatchRecord | null): string | null {
        if (!persistedBatch || persistedBatch.action !== 'show' || persistedBatch.pending.length === 0) {
            return null;
        }

        const normalizedCurrentPath = this.normalizePath(currentPath);
        for (let i = persistedBatch.pending.length - 1; i >= 0; i--) {
            const pending = persistedBatch.pending[i];
            if (
                this.normalizePath(pending.oldPath) === normalizedCurrentPath
                && this.isShowTransition(pending.oldPath, pending.newPath)
            ) {
                return this.normalizePath(pending.newPath);
            }
        }

        return null;
    }

    private findRecordedRestoreTarget(currentPath: string, persistedBatch?: PersistedBatchRecord | null): string | null {
        const normalizedCurrentPath = this.normalizePath(currentPath);
        if (!this.isHiddenPath(normalizedCurrentPath)) {
            return null;
        }

        const pendingShowTarget = this.findPendingShowTarget(normalizedCurrentPath, persistedBatch);
        if (pendingShowTarget) {
            return pendingShowTarget;
        }

        for (let i = this.operations.length - 1; i >= 0; i--) {
            const operation = this.operations[i];
            if (
                this.normalizePath(operation.newPath) === normalizedCurrentPath
                && this.isHideTransition(operation.oldPath, operation.newPath)
            ) {
                return this.normalizePath(operation.oldPath);
            }
        }

        if (!persistedBatch) {
            return null;
        }

        for (let i = persistedBatch.completed.length - 1; i >= 0; i--) {
            const operation = persistedBatch.completed[i];
            if (
                this.normalizePath(operation.newPath) === normalizedCurrentPath
                && this.isHideTransition(operation.oldPath, operation.newPath)
            ) {
                return this.normalizePath(operation.oldPath);
            }
        }

        return null;
    }

    public canRestorePath(relPath: string, persistedBatch?: PersistedBatchRecord | null): boolean {
        return this.findRecordedRestoreTarget(relPath, persistedBatch) !== null;
    }

    public filterRestorableFiles(files: FileInfo[], persistedBatch?: PersistedBatchRecord | null): FileInfo[] {
        return files.filter(fileInfo => this.canRestorePath(fileInfo.path, persistedBatch));
    }

    private computeRenamedPath(currentPath: string, isAdd: boolean, persistedBatch?: PersistedBatchRecord | null): string | null {
        const normalizedCurrentPath = this.normalizePath(currentPath);
        const baseName = path.basename(normalizedCurrentPath);
        const dirName = path.dirname(normalizedCurrentPath);

        if (isAdd) {
            if (baseName.startsWith('.')) {
                return null;
            }
            return this.normalizePath(path.join(dirName, `.${baseName}`));
        }

        if (!baseName.startsWith('.')) {
            return null;
        }

        const recordedTarget = this.findRecordedRestoreTarget(normalizedCurrentPath, persistedBatch);
        if (recordedTarget) {
            return recordedTarget;
        }

        return null;
    }

    private pathDepth(relPath: string): number {
        return this.normalizePath(relPath).split('/').length;
    }

    private isNestedUnderDirectory(relPath: string, directoryPaths: string[]): boolean {
        const normalized = this.normalizePath(relPath);
        return directoryPaths.some(directoryPath => normalized.startsWith(`${directoryPath}/`));
    }

    matchesRule(fileInfo: FileInfo, rule: Rule): boolean {
        const normalizedPath = this.normalizePath(fileInfo.path);

        let pattern = rule.pattern;

        if (pattern.endsWith('/')) {
            if (!fileInfo.isDirectory) {
                return false;
            }
            pattern = pattern.slice(0, -1);
        }

        if (pattern.startsWith('./')) {
            pattern = pattern.slice(2);
        }

        if (pattern.startsWith('/')) {
            pattern = pattern.slice(1);
            const matchOptions = {
                dot: true,
                nocase: false,
                matchBase: false,
                noglobstar: false
            };

            this.debug(`检查绝对路径匹配 - 路径: ${normalizedPath}, 规则: ${pattern}`);
            return minimatch(normalizedPath, pattern, matchOptions);
        }

        if (!pattern.includes('/')) {
            pattern = `**/${pattern}`;
        }

        const matchOptions = {
            dot: true,
            nocase: false,
            matchBase: false,
            noglobstar: false
        };

        this.debug(`检查匹配 - 路径: ${normalizedPath}, 是否为目录: ${fileInfo.isDirectory}, 规则: ${pattern}`);

        return minimatch(normalizedPath, pattern, matchOptions);
    }

    async getFilesToProcess(rules: string[]): Promise<FileInfo[]> {
        return this._getFilesToProcess(rules);
    }

    private async _getFilesToProcess(rulesText: string[]): Promise<FileInfo[]> {
        const allFiles = this.getAllFilesRecursively();
        const parsedRules = this.parseRules(rulesText.join('\n'));

        if (this.DEBUG) {
            this.debug('Parsed rules:', parsedRules);
        }

        const matchedItems = allFiles.filter(fileInfo => {
            let lastMatchNegated: boolean | null = null;
            const currentFilePath = this.normalizePath(fileInfo.path);

            for (const rule of parsedRules) {
                let pattern = rule.pattern;
                const isNegateRule = rule.negate;

                if (pattern.startsWith('./')) {
                    pattern = pattern.substring(2);
                }

                let isAbsolutePathRule = false;
                if (pattern.startsWith('/')) {
                    isAbsolutePathRule = true;
                    pattern = pattern.substring(1);
                }

                if (!isAbsolutePathRule && !pattern.includes('/')) {
                    pattern = `**/${pattern}`;
                }

                const minimatchOptions = {
                    dot: true,
                    nocase: false,
                    matchBase: false
                };

                let primaryPathToTest = currentFilePath;
                if (rule.pattern.endsWith('/') && fileInfo.isDirectory && !primaryPathToTest.endsWith('/')) {
                    primaryPathToTest += '/';
                }

                if (isNegateRule) {
                    if (minimatch(primaryPathToTest, pattern, minimatchOptions)) {
                        if (this.DEBUG) {
                            this.debug(
                                `File "${currentFilePath}" (${fileInfo.isDirectory ? 'dir' : 'file'}) NEGATIVELY matches rule "${rule.pattern}" (transformed: "${pattern}") on primary path.`
                            );
                        }
                        lastMatchNegated = true;
                    }
                } else {
                    let ruleMatchedThisFile = false;
                    if (minimatch(primaryPathToTest, pattern, minimatchOptions)) {
                        if (this.DEBUG) {
                            this.debug(
                                `File "${currentFilePath}" (${fileInfo.isDirectory ? 'dir' : 'file'}) matches rule "${rule.pattern}" (transformed: "${pattern}") on PRIMARY path.`
                            );
                        }
                        ruleMatchedThisFile = true;
                    } else {
                        const fName = fileInfo.name;
                        if (fName && fName !== '.' && fName !== '..') {
                            const parentDir = path.dirname(currentFilePath);
                            const toggledFName = fName.startsWith('.') ? fName.substring(1) : `.${fName}`;

                            let alternateFilePath;
                            if (parentDir === '.' || parentDir === '') {
                                alternateFilePath = toggledFName;
                            } else {
                                alternateFilePath = `${parentDir}/${toggledFName}`;
                            }

                            let alternatePathToTestAgainstRule = alternateFilePath;
                            if (rule.pattern.endsWith('/') && fileInfo.isDirectory && !alternatePathToTestAgainstRule.endsWith('/')) {
                                alternatePathToTestAgainstRule += '/';
                            }

                            if (minimatch(alternatePathToTestAgainstRule, pattern, minimatchOptions)) {
                                if (this.DEBUG) {
                                    this.debug(
                                        `File "${currentFilePath}" (${fileInfo.isDirectory ? 'dir' : 'file'}) matches rule "${rule.pattern}" (transformed: "${pattern}") on ALTERNATE path "${alternatePathToTestAgainstRule}".`
                                    );
                                }
                                ruleMatchedThisFile = true;
                            }
                        }
                    }

                    if (ruleMatchedThisFile) {
                        lastMatchNegated = false;
                    }
                }
            }

            const shouldBeIncluded = lastMatchNegated === false;

            if (this.DEBUG && lastMatchNegated !== null) {
                this.debug(
                    `File "${currentFilePath}" final decision: ${shouldBeIncluded ? 'INCLUDE' : 'EXCLUDE'} (lastMatchNegated: ${lastMatchNegated})`
                );
            }

            return shouldBeIncluded;
        });

        if (this.DEBUG) {
            this.debug(
                `Final matched items: ${matchedItems.length} items:`,
                matchedItems.map(f => `${f.path}${f.isDirectory ? '/' : ''}`)
            );
        }

        return matchedItems;
    }

    public buildRenamePlan(files: FileInfo[], hide: boolean, persistedBatch?: PersistedBatchRecord | null): RenamePlan {
        const action: BatchAction = hide ? 'hide' : 'show';
        const plan: RenamePlan = {
            action,
            requestedCount: files.length,
            noopCount: 0,
            skippedProtected: 0,
            skippedNested: 0,
            skippedConflicts: 0,
            items: [],
            conflicts: [],
        };

        const candidates = files
            .map(fileInfo => ({
                fileInfo,
                oldPath: this.normalizePath(fileInfo.path),
                newPath: this.computeRenamedPath(fileInfo.path, hide, persistedBatch),
            }))
            .sort((a, b) => {
                if (a.fileInfo.isDirectory !== b.fileInfo.isDirectory) {
                    return a.fileInfo.isDirectory ? -1 : 1;
                }
                const depthDiff = this.pathDepth(a.oldPath) - this.pathDepth(b.oldPath);
                return depthDiff !== 0 ? depthDiff : a.oldPath.localeCompare(b.oldPath);
            });

        const plannedDirectories: string[] = [];
        const seenTargets = new Set<string>();

        for (const candidate of candidates) {
            const { fileInfo, oldPath, newPath } = candidate;

            if (this.isProtectedPath(oldPath)) {
                plan.skippedProtected++;
                plan.conflicts.push({
                    oldPath,
                    newPath: newPath ?? oldPath,
                    reason: 'protected',
                });
                continue;
            }

            if (!newPath || newPath === oldPath) {
                plan.noopCount++;
                continue;
            }

            if (this.isNestedUnderDirectory(oldPath, plannedDirectories)) {
                plan.skippedNested++;
                plan.conflicts.push({
                    oldPath,
                    newPath,
                    reason: 'nested-under-directory',
                });
                continue;
            }

            const targetFullPath = this.localFs.getFullPath(newPath);
            if (fs.existsSync(targetFullPath)) {
                plan.skippedConflicts++;
                plan.conflicts.push({
                    oldPath,
                    newPath,
                    reason: 'target-exists',
                });
                continue;
            }

            if (seenTargets.has(newPath)) {
                plan.skippedConflicts++;
                plan.conflicts.push({
                    oldPath,
                    newPath,
                    reason: 'duplicate-target',
                });
                continue;
            }

            plan.items.push({
                oldPath,
                newPath,
                isDirectory: fileInfo.isDirectory,
                oldName: path.basename(oldPath),
                newName: path.basename(newPath),
            });

            seenTargets.add(newPath);
            if (fileInfo.isDirectory) {
                plannedDirectories.push(oldPath);
            }
        }

        return plan;
    }

    private async renamePaths(
        sourcePath: string,
        targetPath: string,
        context: { action: BatchAction | 'rollback'; recordInMemory?: boolean }
    ): Promise<RenameResult> {
        const vaultCurrentPath = this.normalizePath(sourcePath);
        const vaultNewPath = this.normalizePath(targetPath);

        if (vaultNewPath === vaultCurrentPath) {
            this.debug(`New path "${vaultNewPath}" is identical to current path "${vaultCurrentPath}". No rename needed.`);
            return { success: true, changed: false };
        }

        const targetFullPath = this.localFs.getFullPath(vaultNewPath);
        if (fs.existsSync(targetFullPath)) {
            const errorMsg = `Target path already exists: "${vaultNewPath}"`;
            this.debug(`${errorMsg}. Operation aborted to prevent data loss.`);
            this.audit('warn', 'rename-skipped-target-exists', {
                operation: context.action,
                source: vaultCurrentPath,
                target: vaultNewPath
            });
            return { success: false, changed: false, error: errorMsg };
        }

        try {
            this.debug(`Attempting to rename "${vaultCurrentPath}" to "${vaultNewPath}"`);
            const sourceFullPath = this.localFs.getFullPath(vaultCurrentPath);
            const file = this.vault.getAbstractFileByPath(vaultCurrentPath);
            if (file) {
                await this.vault.rename(file, vaultNewPath);
            } else {
                const adapter = this.vault.adapter as unknown as FileSystemAdapterExtended;
                if (adapter?.rename && fs.existsSync(sourceFullPath)) {
                    await adapter.rename(vaultCurrentPath, vaultNewPath);
                } else {
                    const errorMsg = `File not found in Vault: "${vaultCurrentPath}"`;
                    this.debug(errorMsg);
                    this.audit('warn', 'rename-missing-source', {
                        operation: context.action,
                        source: vaultCurrentPath,
                        target: vaultNewPath
                    });
                    return { success: false, changed: false, error: errorMsg };
                }
            }

            this.debug(`Successfully renamed "${vaultCurrentPath}" to "${vaultNewPath}"`);
            if (context.recordInMemory !== false) {
                this.operations.push({ oldPath: vaultCurrentPath, newPath: vaultNewPath, timestamp: Date.now() });
            }
            this.invalidateFileCache();
            this.audit('info', 'rename-completed', {
                operation: context.action,
                source: vaultCurrentPath,
                target: vaultNewPath
            });
            return { success: true, changed: true };
        } catch (error: any) {
            const errorMsg = `Error renaming "${vaultCurrentPath}" to "${vaultNewPath}": ${error.message}`;
            this.debug(errorMsg, error);
            this.audit('error', 'rename-failed', {
                operation: context.action,
                source: vaultCurrentPath,
                target: vaultNewPath,
                message: error?.message ?? String(error)
            });
            return { success: false, changed: false, error: errorMsg };
        }
    }

    public async executePlanItem(item: RenamePlanItem, action: BatchAction): Promise<RenameResult> {
        return this.renamePaths(item.oldPath, item.newPath, { action, recordInMemory: true });
    }

    public async addDotPrefix(
        fileInfo: FileInfo,
        isAdd: boolean = true,
        persistedBatch?: PersistedBatchRecord | null
    ): Promise<RenameResult> {
        if (this.isProtectedPath(fileInfo.path)) {
            return { success: false, changed: false, error: `Protected path: ${fileInfo.path}` };
        }

        const newPath = this.computeRenamedPath(fileInfo.path, isAdd, persistedBatch);
        if (!newPath) {
            return { success: true, changed: false };
        }

        return this.renamePaths(fileInfo.path, newPath, {
            action: isAdd ? 'hide' : 'show',
            recordInMemory: true,
        });
    }

    public async rollbackBatch(operations: FileOperation[]): Promise<void> {
        const reversed = [...operations].reverse();
        this.debug('Rolling back batch containing operations:', reversed.map(op => `${op.newPath} -> ${op.oldPath}`));

        for (const op of reversed) {
            const currentFullPath = this.localFs.getFullPath(op.newPath);
            if (!fs.existsSync(currentFullPath)) {
                this.audit('warn', 'rollback-source-missing', {
                    source: op.newPath,
                    target: op.oldPath,
                });
                continue;
            }

            const result = await this.renamePaths(op.newPath, op.oldPath, {
                action: 'rollback',
                recordInMemory: false,
            });
            if (!result.success) {
                throw new Error(result.error || 'Rollback failed');
            }
        }

        this.invalidateFileCache();
    }

    async rollback(): Promise<void> {
        this.debug('Starting rollback operation');
        if (this.operations.length === 0) {
            this.debug('No operations to rollback');
            return;
        }

        const lastOpTimestamp = this.operations[this.operations.length - 1].timestamp;
        const batchToRollback: FileOperation[] = [];
        let i = this.operations.length - 1;
        while (i >= 0 && Math.abs(this.operations[i].timestamp - lastOpTimestamp) < 1500) {
            batchToRollback.push(this.operations[i]);
            i--;
        }

        if (batchToRollback.length === 0) {
            this.debug('No suitable batch found for rollback based on timestamp.');
            return;
        }

        await this.rollbackBatch(batchToRollback);
        this.operations.splice(this.operations.length - batchToRollback.length, batchToRollback.length);
        this.debug('Rollback finished. Remaining operations:', this.operations);
    }

    private invalidateFileCache() {
        this.fileCache = null;
    }

    getHiddenFiles(): TFile[] {
        const allFiles = this.getAllFilesRecursively();
        const hiddenFiles = allFiles
            .filter(file => !file.isDirectory && this.isHiddenPath(file.path))
            .map(fileInfo => this.vault.getAbstractFileByPath(fileInfo.path))
            .filter((file): file is TFile => file instanceof TFile);

        this.debug('Current hidden files:', hiddenFiles.map(f => f.path));
        return hiddenFiles;
    }

    public getDisplayPath(fileOrPath: TAbstractFile | string, isFolder?: boolean): string {
        const pathValue = typeof fileOrPath === 'string' ? fileOrPath : fileOrPath.path;
        const shouldAddSlash = isFolder ?? (fileOrPath instanceof TFolder);
        return shouldAddSlash ? `${pathValue}/` : pathValue;
    }
}
