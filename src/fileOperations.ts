import { TAbstractFile, TFile, TFolder, Vault } from 'obsidian';
import minimatch from 'minimatch';
import { LocalFileSystem, FileInfo } from './localFileSystem';
import path from 'path';
import fs from 'fs';

interface FileSystemAdapterExtended {
    getBasePath(): string;
    rename?(oldPath: string, newPath: string): Promise<void>;
}

export interface FileOperation {
    oldPath: string;
    newPath: string;
    timestamp: number;
}

export interface Rule {
    pattern: string;
    negate: boolean;
}

export class FileOperations {
    private vault: Vault;
    private localFs: LocalFileSystem;
    private operations: FileOperation[] = [];
    private DEBUG = false;  // 默认关闭调试模式
    private rules: Rule[] = [];
    private fileCache: { items: FileInfo[]; timestamp: number } | null = null;
    private static CACHE_TTL = 2000;
    // 受保护目录（不允许被隐藏/显示操作）——基于库根的相对路径首段
    private static PROTECTED_PREFIXES = [
        '.obsidian',
        '.git',
        '.trash',
    ];

    constructor(vault: Vault) {
        this.vault = vault;
        // 通过泛型转换获得 adapter 的类型并获取 basePath
        const adapter = (this.vault.adapter as unknown) as FileSystemAdapterExtended;
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

    /**
     * 解析规则字符串
     */
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

    /**
     * 递归获取所有文件，包括隐藏文件
     */
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

    /**
     * 判断是否为受保护路径（例如 .obsidian/、.git/ 等）
     */
    public isProtectedPath(relPath: string): boolean {
        const normalized = relPath.replace(/\\/g, '/');
        const top = normalized.split('/')[0];
        return FileOperations.PROTECTED_PREFIXES.includes(top);
    }

    /**
     * 检查文件是否匹配规则（类似 .gitignore 规则）
     */
    matchesRule(fileInfo: FileInfo, rule: Rule): boolean {
        // 统一使用正斜杠
        const normalizedPath = fileInfo.path.replace(/\\/g, '/');

        let pattern = rule.pattern;

        // 处理目录匹配（以 / 结尾）
        if (pattern.endsWith('/')) {
            // 如果是目录匹配，且目标不是目录，直接返回 false
            if (!fileInfo.isDirectory) {
                return false;
            }
            // 不再添加 **/*，只匹配目录本身
            pattern = pattern.slice(0, -1);
        }

        // 处理 ./ 开头的相对路径
        if (pattern.startsWith('./')) {
            pattern = pattern.slice(2);
        }

        // 处理绝对路径（以 / 开头）
        if (pattern.startsWith('/')) {
            pattern = pattern.slice(1);
            // 对于绝对路径，直接进行完整路径匹配
            const matchOptions = {
                dot: true,           // 匹配点文件
                nocase: false,       // 区分大小写
                matchBase: false,    // 使用完整路径匹配
                noglobstar: false    // 启用 ** 匹配
            };

            this.debug(`检查绝对路径匹配 - 路径: ${normalizedPath}, 规则: ${pattern}`);
            return minimatch(normalizedPath, pattern, matchOptions);
        }

        // 如果模式不包含 /，则匹配任意目录下的文件/文件夹
        if (!pattern.includes('/')) {
            pattern = '**/' + pattern;
        }

        // 使用 minimatch 进行 glob 匹配
        const matchOptions = {
            dot: true,           // 匹配点文件
            nocase: false,       // 区分大小写
            matchBase: false,    // 使用完整路径匹配
            noglobstar: false    // 启用 ** 匹配
        };

        this.debug(`检查匹配 - 路径: ${normalizedPath}, 是否为目录: ${fileInfo.isDirectory}, 规则: ${pattern}`);

        return minimatch(normalizedPath, pattern, matchOptions);
    }

    /**
     * 获取需要处理的文件列表
     */
    async getFilesToProcess(rules: string[]): Promise<FileInfo[]> {
        return this._getFilesToProcess(rules);
    }

    /**
     * 实际的文件处理逻辑（私有方法）
     */
    private async _getFilesToProcess(rulesText: string[]): Promise<FileInfo[]> {
        const allFiles = this.getAllFilesRecursively();
        const parsedRules = this.parseRules(rulesText.join('\n'));

        if (this.DEBUG) {
            this.debug("Parsed rules:", parsedRules);
        }

        const matchedItems = allFiles.filter(fileInfo => {
            let lastMatchNegated: boolean | null = null;
            const currentFilePath = fileInfo.path.replace(/\\/g, '/'); // Base path for logic

            for (const rule of parsedRules) {
                let pattern = rule.pattern;
                const isNegateRule = rule.negate;

                // 1. Handle directory-specific patterns (ending with /)
                // (This check is mainly for how minimatch interprets the pattern,
                // the path itself will be adjusted with a trailing slash later if needed)
                // let isDirectoryRule = pattern.endsWith('/');

                // 2. Handle relative paths starting with ./
                if (pattern.startsWith('./')) {
                    pattern = pattern.substring(2);
                }

                let isAbsolutePathRule = false;
                if (pattern.startsWith('/')) {
                    isAbsolutePathRule = true;
                    pattern = pattern.substring(1); // Remove leading / for matching against relative vault path
                }

                // 3. If pattern does not contain a slash, and it's not an absolute path rule,
                //    it should match in any directory. Prepend '**/' to achieve this.
                if (!isAbsolutePathRule && !pattern.includes('/')) {
                    pattern = '**/' + pattern;
                }

                // minimatch options
                const minimatchOptions = {
                    dot: true,       // Match dotfiles (e.g. .git) - allows * to match .file
                    nocase: false,   // Case-sensitive matching
                    matchBase: false // Pattern should match against the full path
                };

                // Prepare the primary path to test against this rule
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
                } else { // This is an inclusion rule
                    let ruleMatchedThisFile = false;
                    if (minimatch(primaryPathToTest, pattern, minimatchOptions)) {
                        if (this.DEBUG) {
                            this.debug(
                                `File "${currentFilePath}" (${fileInfo.isDirectory ? 'dir' : 'file'}) matches rule "${rule.pattern}" (transformed: "${pattern}") on PRIMARY path.`
                            );
                        }
                        ruleMatchedThisFile = true;
                    } else {
                        // Try alternate path (toggled dot version of the file's name)
                        const fName = fileInfo.name;
                        // Ensure fName is valid and not a dot-directory like '.' or '..'
                        if (fName && fName !== '.' && fName !== '..') {
                            const parentDir = path.dirname(currentFilePath); // path.dirname('foo.txt') is '.'

                            const toggledFName = fName.startsWith('.') ? fName.substring(1) : '.' + fName;

                            let alternateFilePath;
                            // If parentDir is '.', the file is in the vault root.
                            if (parentDir === '.' || parentDir === '') {
                                alternateFilePath = toggledFName;
                            } else {
                                // Reconstruct path with forward slashes
                                alternateFilePath = parentDir + '/' + toggledFName;
                            }

                            let alternatePathToTestAgainstRule = alternateFilePath;
                            // Ensure trailing slash for directory matching if needed
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
            } // end rule loop

            // If lastMatchNegated is null, no rules matched.
            // If it's true, the last matching rule was a negation (exclude).
            // If it's false, the last matching rule was an inclusion (include).
            const shouldBeIncluded = lastMatchNegated === false;

            if (this.DEBUG && lastMatchNegated !== null) {
                this.debug(
                    `File "${currentFilePath}" final decision: ${shouldBeIncluded ? 'INCLUDE' : 'EXCLUDE'} (lastMatchNegated: ${lastMatchNegated})`
                );
            }

            return shouldBeIncluded;
        });

        if (this.DEBUG) {
            this.debug(`Final matched items: ${matchedItems.length} items:`,
                matchedItems.map(f => `${f.path}${f.isDirectory ? '/' : ''}`));
        }

        return matchedItems;
    }

    /**
     * 重命名文件或文件夹，通过添加或移除点前缀。
     * @param fileInfo 要操作的文件或文件夹的信息
     * @param isAdd true 则添加点前缀（隐藏），false 则移除点前缀（显示）
     * @returns Promise resolving to an object { success: boolean, error?: string }
     */
    public async addDotPrefix(fileInfo: FileInfo, isAdd: boolean = true): Promise<{ success: boolean; error?: string }> {
        if (this.isProtectedPath(fileInfo.path)) {
            return { success: false, error: `Protected path: ${fileInfo.path}` };
        }
        const currentPath = fileInfo.path;
        const isDirectory = fileInfo.isDirectory;
        let newPath: string;

        const baseName = path.basename(currentPath);
        const dirName = path.dirname(currentPath);

        if (isAdd) {
            // Hide: Add dot if not present
            if (baseName.startsWith('.')) {
                this.debug(`File "${currentPath}" is already hidden. No action needed.`);
                return { success: true }; // Considered success as no change is needed
            }
            newPath = path.join(dirName, '.' + baseName);
        } else {
            // Show: Remove dot if present
            if (!baseName.startsWith('.')) {
                this.debug(`File "${currentPath}" is already visible. No action needed.`);
                return { success: true }; // Considered success as no change is needed
            }
            newPath = path.join(dirName, baseName.substring(1));
        }

        // 确保路径分隔符统一为 Obsidian Vault 使用的 '/'
        const vaultNewPath = newPath.replace(/\\/g, '/');
        const vaultCurrentPath = currentPath.replace(/\\/g, '/');

        if (vaultNewPath === vaultCurrentPath) {
            this.debug(`New path "${vaultNewPath}" is identical to current path "${vaultCurrentPath}". No rename needed.`);
            return { success: true };
        }

        // ⚠️ 安全检查：确保目标路径不存在，避免数据覆盖
        const targetFullPath = this.localFs.getFullPath(vaultNewPath);
        if (fs.existsSync(targetFullPath)) {
            const errorMsg = `Target path already exists: "${vaultNewPath}"`;
            this.debug(`${errorMsg}. Operation aborted to prevent data loss.`);
            this.audit('warn', 'rename-skipped-target-exists', {
                operation: isAdd ? 'hide' : 'show',
                source: vaultCurrentPath,
                target: vaultNewPath
            });
            return { success: false, error: errorMsg };
        }

        try {
            this.debug(`Attempting to rename "${vaultCurrentPath}" to "${vaultNewPath}"`);
            const file = this.vault.getAbstractFileByPath(vaultCurrentPath);
            if (file) {
                await this.vault.rename(file, vaultNewPath);
                this.debug(`Successfully renamed "${vaultCurrentPath}" to "${vaultNewPath}"`);
                this.operations.push({ oldPath: vaultCurrentPath, newPath: vaultNewPath, timestamp: Date.now() });
                this.invalidateFileCache();
                this.audit('info', 'rename-completed', {
                    method: 'vault',
                    operation: isAdd ? 'hide' : 'show',
                    source: vaultCurrentPath,
                    target: vaultNewPath
                });
                return { success: true };
            }

            const adapter = (this.vault.adapter as unknown) as FileSystemAdapterExtended;
            if (adapter?.rename) {
                await adapter.rename(vaultCurrentPath, vaultNewPath);
                this.debug(`Adapter rename successful for "${vaultCurrentPath}" -> "${vaultNewPath}"`);
                this.operations.push({ oldPath: vaultCurrentPath, newPath: vaultNewPath, timestamp: Date.now() });
                this.invalidateFileCache();
                this.audit('info', 'rename-completed', {
                    method: 'adapter',
                    operation: isAdd ? 'hide' : 'show',
                    source: vaultCurrentPath,
                    target: vaultNewPath
                });
                return { success: true };
            }

            const errorMsg = `File not found in Vault: "${vaultCurrentPath}"`;
            this.debug(errorMsg);
            this.audit('warn', 'rename-missing-source', {
                operation: isAdd ? 'hide' : 'show',
                source: vaultCurrentPath,
                target: vaultNewPath
            });
            return { success: false, error: errorMsg };
        } catch (error: any) {
            const errorMsg = `Error renaming "${vaultCurrentPath}" to "${vaultNewPath}": ${error.message}`;
            this.debug(errorMsg, error);
            this.audit('error', 'rename-failed', {
                operation: isAdd ? 'hide' : 'show',
                source: vaultCurrentPath,
                target: vaultNewPath,
                message: error?.message ?? String(error)
            });
            return { success: false, error: errorMsg };
        }
    }

    /**
     * 回滚最近的操作
     */
    async rollback(): Promise<void> {
        this.debug('Starting rollback operation');
        if (this.operations.length === 0) {
            this.debug('No operations to rollback');
            return;
        }

        let batchToRollback: FileOperation[] = [];
        if (this.operations.length > 0) {
            const lastOpTimestamp = this.operations[this.operations.length - 1].timestamp;
            let i = this.operations.length - 1;
            while (i >= 0 && Math.abs(this.operations[i].timestamp - lastOpTimestamp) < 1500) {
                batchToRollback.push(this.operations[i]);
                i--;
            }
            // batchToRollback is currently in reverse order of application, which is correct for rollback iteration
        } else {
            // Should be caught by operations.length === 0 already
            this.debug('No operations found for batching.');
            return;
        }

        if (batchToRollback.length === 0) {
            this.debug('No suitable batch found for rollback based on timestamp.');
            return;
        }

        this.debug('Rolling back batch containing operations:', batchToRollback.map(op => `${op.newPath} -> ${op.oldPath}`));

        // Iterate in the order they were pushed to batch (which is reverse of application)
        for (const op of batchToRollback) {
            this.debug(`Attempting to roll back (FS): revert ${op.newPath} to ${op.oldPath}`);
            try {
                const currentFullPath = this.localFs.getFullPath(op.newPath); // Path to rename FROM (current state)
                const targetFullPath = this.localFs.getFullPath(op.oldPath); // Path to rename TO (original state)

                if (!fs.existsSync(currentFullPath)) {
                    // If the file we expect to rename FROM doesn't exist, we might have a problem or it was already reverted.
                    this.debug(`警告: 回滚源文件 ${op.newPath} (物理路径 ${currentFullPath}) 未找到. 可能已被回滚或删除。`);
                    // We could choose to throw, or to continue if other operations might still be valid.
                    // For now, let's log and attempt to remove this op from history assuming it was handled/irrelevant.
                    continue; // Skip to next operation in batch
                }
                if (fs.existsSync(targetFullPath)) {
                    throw new Error(`回滚目标文件 ${op.oldPath} (物理路径 ${targetFullPath}) 已存在.`);
                }

                fs.renameSync(currentFullPath, targetFullPath);
                this.debug(`FS rollback successful: ${op.newPath} -> ${op.oldPath}`);

            } catch (error) {
                this.debug(`FS 回滚操作失败 for ${op.newPath} -> ${op.oldPath}:`, error);
                // If one operation in the batch fails, we stop the whole batch rollback to avoid inconsistent state.
                throw error;
            }
        }

        // Remove the successfully processed batch from operations history.
        const numRolledBackActually = batchToRollback.length; // Assuming if loop completes, all in batch were attempted.
        // Error thrown above will stop before this line.
        this.operations.splice(this.operations.length - numRolledBackActually, numRolledBackActually);

        this.debug('Rollback finished. Remaining operations:', this.operations);
        this.invalidateFileCache();
    }

    private invalidateFileCache() {
        this.fileCache = null;
    }

    /**
     * 获取当前隐藏的文件列表
     */
    getHiddenFiles(): TFile[] {
        const allFiles = this.getAllFilesRecursively();
        const hiddenFiles = allFiles
            .filter(file => !file.isDirectory && file.name.startsWith('.'))
            .map(fileInfo => this.vault.getAbstractFileByPath(fileInfo.path))
            .filter((file): file is TFile => file instanceof TFile);

        this.debug('Current hidden files:', hiddenFiles.map(f => f.path));
        return hiddenFiles;
    }

    /**
     * 获取用于显示的路径（文件夹添加/后缀）
     */
    public getDisplayPath(fileOrPath: TAbstractFile | string, isFolder?: boolean): string {
        const path = typeof fileOrPath === 'string' ? fileOrPath : fileOrPath.path;
        const shouldAddSlash = isFolder ?? (fileOrPath instanceof TFolder);
        return shouldAddSlash ? path + '/' : path;
    }
} 
