import { TAbstractFile, TFile, TFolder, Vault } from 'obsidian';
import minimatch from 'minimatch';
import { LocalFileSystem, FileInfo } from './localFileSystem';
import path from 'path';
import fs from 'fs';

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

    constructor(vault: Vault) {
        this.vault = vault;
        // @ts-ignore
        this.localFs = new LocalFileSystem(this.vault.adapter.getBasePath());
    }

    setDebug(enabled: boolean) {
        this.DEBUG = enabled;
    }

    private debug(...args: any[]) {
        if (this.DEBUG) {
            console.log('[ObsidianIgnore]', ...args);
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
        return this.localFs.getAllFiles(currentPath);
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
                nocase: true,        // 忽略大小写
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
            nocase: true,        // 忽略大小写
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
        // 获取所有文件和文件夹
        const allFiles = this.getAllFilesRecursively();

        // 调试输出所有找到的文件和文件夹
        if (this.DEBUG) {
            this.debug('所有文件和文件夹:', allFiles.map(f => `${f.path}${f.isDirectory ? '/' : ''}`));
        }

        const matchedItems = allFiles.filter(fileInfo => {
            return rules.some(rule => {
                // 如果是绝对路径规则（以 / 开头）
                if (rule.startsWith('/')) {
                    const pattern = rule.slice(1);
                    const matched = minimatch(fileInfo.path, pattern, {
                        dot: true,
                        nocase: true,
                        matchBase: false,
                        noglobstar: false
                    });

                    if (matched && this.DEBUG) {
                        this.debug(`绝对路径匹配成功 - 路径: ${fileInfo.path}, 规则: ${rule}`);
                    }
                    return matched;
                }

                // 创建匹配模式
                const createPatterns = (pattern: string): string[] => {
                    // 如果模式已经以点开头，只返回原模式
                    if (pattern.startsWith('.')) {
                        return [pattern];
                    }
                    // 否则返回原模式和带点版本
                    return [pattern, '.' + pattern];
                };

                // 如果规则以 / 结尾，匹配目录本身和带点前缀的目录
                if (rule.endsWith('/')) {
                    const basePattern = rule.slice(0, -1);
                    const patterns = createPatterns(basePattern);

                    // 如果模式包含通配符但不是绝对路径，添加 **/ 前缀以匹配任意层级
                    const finalPatterns = patterns.map(pattern => {
                        if (pattern.includes('*') && !pattern.startsWith('/')) {
                            return '**/' + pattern;
                        }
                        return pattern;
                    });

                    // 只匹配目录，且必须匹配其中一个模式
                    const matched = fileInfo.isDirectory && finalPatterns.some(pattern =>
                        minimatch(fileInfo.path, pattern, {
                            dot: true,
                            nocase: true,
                            matchBase: false,
                            noglobstar: false
                        })
                    );

                    if (matched && this.DEBUG) {
                        this.debug(`目录匹配成功 - 路径: ${fileInfo.path}/, 规则: ${rule}`);
                    }
                    return matched;
                }

                // 处理文件匹配
                // 如果模式包含通配符但不是绝对路径，添加 **/ 前缀以匹配任意层级
                const patterns = createPatterns(rule).map(pattern => {
                    if ((pattern.includes('*') || !pattern.includes('/')) && !pattern.startsWith('/')) {
                        return '**/' + pattern;
                    }
                    return pattern;
                });

                // 匹配文件
                const matched = !fileInfo.isDirectory && patterns.some(pattern =>
                    minimatch(fileInfo.path, pattern, {
                        dot: true,
                        nocase: true,
                        matchBase: false,
                        noglobstar: false
                    })
                );

                if (matched && this.DEBUG) {
                    this.debug(`文件匹配成功 - 路径: ${fileInfo.path}, 规则: ${rule}`);
                }
                return matched;
            });
        });

        if (this.DEBUG) {
            this.debug(`匹配结果: ${matchedItems.length} 个项目:`,
                matchedItems.map(f => `${f.path}${f.isDirectory ? '/' : ''}`));
        }

        return matchedItems;
    }

    /**
     * 添加或移除点前缀
     */
    public async addDotPrefix(fileInfo: FileInfo, isAdd: boolean = true): Promise<void> {
        let newPath: string;
        const displayPath = fileInfo.isDirectory ? fileInfo.path + '/' : fileInfo.path;

        if (isAdd) {
            if (fileInfo.name.startsWith('.')) {
                this.debug(`${fileInfo.isDirectory ? '文件夹' : '文件'} ${displayPath} 已包含点前缀，跳过`);
                return;
            }

            newPath = fileInfo.path.replace(/(.*\/)?([^/]+)/, (match, folder, name) => {
                return (folder ?? '') + '.' + name;
            });

            this.debug(`添加点前缀: ${displayPath} -> ${newPath}${fileInfo.isDirectory ? '/' : ''}`);
        } else {
            if (!fileInfo.name.startsWith('.')) {
                this.debug(`${fileInfo.isDirectory ? '文件夹' : '文件'} ${displayPath} 不含点前缀，跳过`);
                return;
            }

            newPath = fileInfo.path.replace(/(.*\/)?\.+([^/]+)/, (match, folder, name) => {
                return (folder ?? '') + name;
            });

            this.debug(`移除点前缀: ${displayPath} -> ${newPath}${fileInfo.isDirectory ? '/' : ''}`);
        }

        try {
            // 使用 LocalFileSystem 获取完整路径
            const oldFullPath = this.localFs.getFullPath(fileInfo.path);
            const newFullPath = this.localFs.getFullPath(newPath);

            // 检查源文件是否存在
            if (!fs.existsSync(oldFullPath)) {
                throw new Error(`找不到文件: ${fileInfo.path}`);
            }

            // 检查目标路径是否已存在
            if (fs.existsSync(newFullPath)) {
                throw new Error(`目标文件已存在: ${newPath}`);
            }

            // 执行重命名操作
            fs.renameSync(oldFullPath, newFullPath);

            // 如果是非隐藏文件，也通过 Obsidian API 重命名以保持同步
            if (!fileInfo.path.startsWith('.') && !newPath.startsWith('.')) {
                const abstractFile = this.vault.getAbstractFileByPath(fileInfo.path);
                if (abstractFile) {
                    await this.vault.rename(abstractFile, newPath);
                }
            }

            this.operations.push({
                oldPath: fileInfo.path,
                newPath: newPath,
                timestamp: Date.now()
            });
        } catch (error) {
            this.debug('重命名失败:', error);
            throw error;
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

        const lastBatch = this.operations.reduce((acc, op) => {
            if (!acc.timestamp || Math.abs(op.timestamp - acc.timestamp) < 1000) {
                acc.operations.push(op);
                acc.timestamp = op.timestamp;
            }
            return acc;
        }, { operations: [] as FileOperation[], timestamp: 0 });

        this.debug('Rolling back batch:', lastBatch);

        for (const op of lastBatch.operations.reverse()) {
            this.debug('Rolling back operation:', op);
            try {
                const oldFullPath = this.localFs.getFullPath(op.oldPath);
                const newFullPath = this.localFs.getFullPath(op.newPath);

                // 检查源文件是否存在
                if (!fs.existsSync(newFullPath)) {
                    throw new Error(`找不到文件: ${op.newPath}`);
                }

                // 检查目标路径是否已存在
                if (fs.existsSync(oldFullPath)) {
                    throw new Error(`目标文件已存在: ${op.oldPath}`);
                }

                // 执行重命名操作
                fs.renameSync(newFullPath, oldFullPath);

                // 如果是非隐藏文件，也通过 Obsidian API 重命名以保持同步
                if (!op.newPath.startsWith('.') && !op.oldPath.startsWith('.')) {
                    const abstractFile = this.vault.getAbstractFileByPath(op.newPath);
                    if (abstractFile) {
                        await this.vault.rename(abstractFile, op.oldPath);
                    }
                }

                this.debug('Successfully rolled back:', op.newPath, 'to', op.oldPath);
            } catch (error) {
                this.debug('Failed to rollback:', op.newPath, error);
                throw error;
            }
        }

        // 移除已回滚的操作记录
        this.operations = this.operations.slice(0, -lastBatch.operations.length);
        this.debug('Remaining operations:', this.operations);
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