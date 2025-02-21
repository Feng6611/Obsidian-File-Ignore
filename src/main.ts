import { App, Plugin, PluginSettingTab, Setting, Notice, TFile, TFolder } from 'obsidian';
import { FileOperations } from './fileOperations';
import { ObsidianIgnoreSettings, DEFAULT_SETTINGS, ObsidianIgnoreSettingTab } from './settings';
import { LocalFileSystem, FileInfo } from './localFileSystem';
import { debounce } from './utils/debounce';

// 在文件顶部或合适位置增加接口定义
interface FileSystemAdapterExtended {
    getBasePath(): string;
}

export default class ObsidianIgnore extends Plugin {
    settings: ObsidianIgnoreSettings;
    fileOps: FileOperations | undefined;
    localFs: LocalFileSystem | undefined;

    async onload() {
        console.log('[file-ignore] 插件开始加载...');
        try {
            await this.loadSettings();
            console.log('[file-ignore] 设置加载完成:', this.settings);

            // 替换原来的 cast，将 vault.adapter 转换为 FileSystemAdapterExtended 类型
            const adapter = (this.app.vault.adapter as unknown) as FileSystemAdapterExtended;
            const basePath = adapter.getBasePath();
            this.fileOps = new FileOperations(this.app.vault);
            this.localFs = new LocalFileSystem(basePath);
            console.log('[file-ignore] FileOperations 初始化完成');
            console.log('[file-ignore] LocalFileSystem 初始化完成, 根目录:', basePath);

            // 添加设置标签页
            this.addSettingTab(new ObsidianIgnoreSettingTab(this.app, this));

            // 监听文件变更
            this.registerEvent(
                this.app.vault.on('rename', () => {
                    // 使用 requestSaveLayout 来刷新文件列表
                    this.app.workspace.requestSaveLayout();
                })
            );

            // 添加命令
            this.addCommand({
                id: 'apply-ignore-rules',
                name: '应用忽略规则',
                callback: async () => {
                    await this.applyRules();
                },
            });

            this.addCommand({
                id: 'add-dot-prefix',
                name: '添加点前缀（隐藏）',
                checkCallback: (checking: boolean) => {
                    const file = this.app.workspace.getActiveFile();
                    if (file) {
                        if (!checking) {
                            this.addDotPrefix(file);
                        }
                        return true;
                    }
                    return false;
                }
            });

            this.addCommand({
                id: 'remove-dot-prefix',
                name: '移除点前缀（显示）',
                checkCallback: (checking: boolean) => {
                    const file = this.app.workspace.getActiveFile();
                    if (file) {
                        if (!checking) {
                            this.removeDotPrefix(file);
                        }
                        return true;
                    }
                    return false;
                }
            });

            this.addCommand({
                id: 'list-directory',
                name: '列出当前目录文件',
                callback: async () => {
                    await this.listCurrentDirectory();
                },
            });

            // 添加右键菜单
            this.registerEvent(
                this.app.workspace.on('file-menu', (menu, file) => {
                    if (file instanceof TFile || file instanceof TFolder) {
                        menu.addItem((item) => {
                            item
                                .setTitle(file.path.startsWith('.') ? '取消隐藏' : '隐藏')
                                .setIcon(file.path.startsWith('.') ? 'eye' : 'eye-off')
                                .onClick(async () => {
                                    if (file.path.startsWith('.')) {
                                        await this.removeDotPrefix(file);
                                    } else {
                                        await this.addDotPrefix(file);
                                    }
                                });
                        });
                    }
                })
            );
        } catch (error) {
            console.error('[file-ignore] 插件加载出错:', error);
        }
    }

    onunload() {
        // 清理工作
        console.log('[file-ignore] 插件正在卸载...');
        // 清理文件操作实例
        if (this.fileOps) {
            this.fileOps = undefined;
        }
        // 清理本地文件系统实例
        if (this.localFs) {
            this.localFs = undefined;
        }
        console.log('[file-ignore] 插件卸载完成');
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        if (this.fileOps) {
            this.fileOps.setDebug(this.settings.debug);
        }
        // 触发设置更新
        this.app.workspace.trigger('file-ignore:settings-update');
    }

    // 文件操作方法
    async addDotPrefix(file: TFile | TFolder) {
        try {
            const fileInfo = this.localFs?.getFileInfo(file.path);
            if (fileInfo) {
                await this.fileOps?.addDotPrefix(fileInfo, true);
                new Notice(`${file instanceof TFolder ? '文件夹' : '文件'}已隐藏`);
                this.app.workspace.requestSaveLayout();
            }
        } catch (error) {
            console.error('隐藏失败:', error);
            new Notice('隐藏失败');
        }
    }

    async removeDotPrefix(file: TFile | TFolder) {
        try {
            const fileInfo = this.localFs?.getFileInfo(file.path);
            if (fileInfo) {
                await this.fileOps?.addDotPrefix(fileInfo, false);
                new Notice(`${file instanceof TFolder ? '文件夹' : '文件'}已显示`);
                this.app.workspace.requestSaveLayout();
            }
        } catch (error) {
            console.error('显示失败:', error);
            new Notice('显示失败');
        }
    }

    async applyRules(isAdd: boolean = true) {
        try {
            if (!this.fileOps) {
                throw new Error('FileOperations 未初始化');
            }

            const rules = this.settings.rules
                .split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('#'));

            if (!rules.length) {
                new Notice('没有有效的规则');
                return;
            }

            const files = await this.fileOps.getFilesToProcess(rules);

            // 只输出匹配结果
            console.log('[file-ignore] 匹配到的文件:',
                files.map(f => f.isDirectory ? f.path + '/' : f.path));

            if (files.length === 0) {
                new Notice('没有找到匹配的文件');
                return;
            }

            for (const file of files) {
                await this.fileOps.addDotPrefix(file, isAdd);
            }

            new Notice(`成功${isAdd ? '隐藏' : '显示'} ${files.length} 个项目`);
            // 请求 Obsidian 刷新文件列表
            this.app.workspace.requestSaveLayout();
        } catch (error) {
            console.error('[file-ignore] 应用规则时出错:', error);
            new Notice('应用规则时出错: ' + error.message);
            throw error;
        }
    }

    async rollback() {
        try {
            await this.fileOps?.rollback();
            // 请求 Obsidian 刷新文件列表
            this.app.workspace.trigger('file-menu');
        } catch (error) {
            console.error('回滚操作失败:', error);
            throw error;
        }
    }

    async listCurrentDirectory() {
        try {
            const files = this.localFs?.listDirectory() || [];
            console.log('[file-ignore] 根目录文件列表:', files);

            // 创建一个临时的 markdown 文件来显示文件列表
            const fileListContent = this.formatFileList(files);
            const tempFile = await this.app.vault.create('文件列表.md', fileListContent);

            // 打开这个文件
            await this.app.workspace.getLeaf().openFile(tempFile);
        } catch (error) {
            console.error('[file-ignore] 列出目录内容失败:', error);
            new Notice('列出目录内容失败: ' + error.message);
        }
    }

    private formatFileList(files: FileInfo[]): string {
        let content = '# 当前目录文件列表\n\n';

        // 分别处理文件夹和文件
        const directories = files.filter(f => f.isDirectory);
        const normalFiles = files.filter(f => !f.isDirectory);

        // 添加文件夹列表
        content += '## 文件夹\n\n';
        if (directories.length > 0) {
            directories.forEach(dir => {
                content += `- 📁 ${dir.path}\n`;
            });
        } else {
            content += '- *没有文件夹*\n';
        }

        // 添加文件列表
        content += '\n## 文件\n\n';
        if (normalFiles.length > 0) {
            normalFiles.forEach(file => {
                const size = this.formatFileSize(file.stats.size);
                const mtime = file.stats.mtime.toLocaleString();
                content += `- 📄 ${file.path}\n  - 大小: ${size}\n  - 修改时间: ${mtime}\n`;
            });
        } else {
            content += '- *没有文件*\n';
        }

        return content;
    }

    private formatFileSize(bytes: number): string {
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }
} 