import { TAbstractFile, TFile, Vault } from 'obsidian';
import minimatch from 'minimatch';

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
    private operations: FileOperation[] = [];
    private DEBUG = false;  // 默认关闭调试模式
    private rules: Rule[] = [];

    constructor(vault: Vault) {
        this.vault = vault;
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
     * 检查文件是否匹配规则（类似 .gitignore 规则）
     */
    matchesRule(file: TFile, rule: Rule): boolean {
        // 统一使用正斜杠
        const normalizedPath = file.path.replace(/\\/g, '/');

        // 获取无点前缀的路径
        const pathWithoutDot = normalizedPath.replace(/(.*\/)?\.+([^/]+)/, (match, folder, name) => {
            return (folder ?? '') + name;
        });

        let pattern = rule.pattern;

        // 处理目录匹配（以 / 结尾）
        if (pattern.endsWith('/')) {
            pattern = pattern + '**/*';
        }

        // 处理 ./ 开头的相对路径
        if (pattern.startsWith('./')) {
            pattern = pattern.slice(2);
        }

        // 处理绝对路径（以 / 开头）
        if (pattern.startsWith('/')) {
            pattern = pattern.slice(1);
        }

        // 如果模式不包含 /，则匹配任意目录下的文件
        if (!pattern.includes('/')) {
            pattern = '**/' + pattern;
        }

        // 使用 minimatch 进行 glob 匹配，同时检查原始路径和无点前缀的路径
        const matchOptions = {
            dot: true,           // 匹配点文件
            nocase: true,        // 忽略大小写
            matchBase: false,    // 使用完整路径匹配
            noglobstar: false    // 启用 ** 匹配
        };

        return minimatch(normalizedPath, pattern, matchOptions) ||
            minimatch(pathWithoutDot, pattern, matchOptions);
    }

    /**
     * 获取需要处理的文件列表
     */
    async getFilesToProcess(rules: string[]): Promise<TFile[]> {
        if (!Array.isArray(rules) || rules.length === 0) {
            return [];
        }

        const files = this.vault.getFiles();

        // 将规则转换为 Rule 对象
        const parsedRules = rules.map(rule => ({
            pattern: rule.startsWith('!') ? rule.slice(1) : rule,
            negate: rule.startsWith('!')
        }));

        // 对每个文件进行匹配（按照 .gitignore 规则）
        const matchedFiles = files.filter(file => {
            let shouldInclude = false;

            for (const rule of parsedRules) {
                const matches = this.matchesRule(file, rule);

                if (rule.negate) {
                    // 如果是排除规则（!pattern）且匹配，则排除该文件
                    if (matches) {
                        return false;
                    }
                } else {
                    // 如果是包含规则且匹配，标记为应该包含
                    if (matches) {
                        shouldInclude = true;
                    }
                }
            }

            return shouldInclude;
        });

        if (this.DEBUG) {
            this.debug(`匹配结果: ${matchedFiles.length} 个文件:`,
                matchedFiles.map(f => f.path));
        }

        return matchedFiles;
    }

    /**
     * 添加或移除点前缀
     * @param file 要处理的文件
     * @param isAdd 为 true 时添加点前缀,为 false 时移除点前缀
     */
    public async addDotPrefix(file: TFile, isAdd: boolean = true): Promise<void> {
        let newPath: string;

        if (isAdd) {
            if (file.name.startsWith('.')) {
                this.debug(`文件 ${file.path} 已包含点前缀，跳过`);
                return;
            }

            newPath = file.path.replace(/(.*\/)?([^/]+)/, (match, folder, name) => {
                return (folder ?? '') + '.' + name;
            });

            this.debug(`添加点前缀: ${file.path} -> ${newPath}`);
            await this.vault.rename(file, newPath);
        } else {
            if (!file.name.startsWith('.')) {
                this.debug(`文件 ${file.path} 不含点前缀，跳过`);
                return;
            }

            newPath = file.path.replace(/(.*\/)?\.+([^/]+)/, (match, folder, name) => {
                return (folder ?? '') + name;
            });

            this.debug(`移除点前缀: ${file.path} -> ${newPath}`);
            await this.vault.rename(file, newPath);
        }

        this.operations.push({
            oldPath: file.path,
            newPath: newPath,
            timestamp: Date.now()
        });
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
            const file = this.vault.getAbstractFileByPath(op.newPath);
            if (file instanceof TFile) {
                await this.vault.rename(file, op.oldPath);
                this.debug('Successfully rolled back:', op.newPath, 'to', op.oldPath);
            } else {
                this.debug('File not found for rollback:', op.newPath);
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
        const hiddenFiles = this.vault.getFiles().filter(file => file.path.startsWith('.'));
        this.debug('Current hidden files:', hiddenFiles.map(f => f.path));
        return hiddenFiles;
    }
} 