import { App, Plugin, PluginSettingTab, Setting, Notice, TFile, TFolder } from 'obsidian';
import { FileOperations } from './fileOperations';
import { FileIgnoreSettings, DEFAULT_SETTINGS, FileIgnoreSettingTab } from './settings';
import { LocalFileSystem, FileInfo } from './localFileSystem';
import { locales, type Translation } from './i18n/locales';
import moment from 'moment';

// 在文件顶部或合适位置增加接口定义
interface FileSystemAdapterExtended {
    getBasePath(): string;
}

export default class FileIgnorePlugin extends Plugin {
    settings: FileIgnoreSettings;
    fileOps: FileOperations | undefined;
    localFs: LocalFileSystem | undefined;
    t: Translation;

    async onload() {
        try {
            // 1. 首先加载设置
            await this.loadSettings();

            // Add a new Notice right after loading settings
            // new Notice('Settings loaded!'); // <-- 移除测试 Notice

            // 2. 现在可以安全地使用 settings 了
            if (this.settings.debug) {
                console.log('[file-ignore] 插件开始加载...');
            }

            // 3. 初始化文件系统
            const adapter = (this.app.vault.adapter as unknown) as FileSystemAdapterExtended;
            const basePath = adapter.getBasePath();

            if (this.settings.debug) {
                console.log('[file-ignore] 设置加载完成:', this.settings);
                console.log('[file-ignore] FileOperations 初始化完成');
                console.log('[file-ignore] LocalFileSystem 初始化完成, 根目录:', basePath);
            }

            // 4. 初始化其他组件
            this.fileOps = new FileOperations(this.app.vault);
            this.localFs = new LocalFileSystem(basePath);

            // 5. 添加设置标签页
            this.addSettingTab(new FileIgnoreSettingTab(this.app, this));

            // 6. 初始化翻译 （新增）
            const locale = moment.locale(); // <-- 使用 Obsidian 的 locale

            if (locale.startsWith('zh')) {
                if (locale === 'zh-tw' || locale === 'zh-hk') {
                    this.t = locales['zh-TW'];
                } else {
                    this.t = locales['zh-CN'];
                }
            } else if (locale === 'ja') {
                this.t = locales.ja;
            } else {
                this.t = locales.en;
            }
            if (this.settings.debug) {
                console.log('[file-ignore] Main locale:', locale);
            }

            // 在这里添加 Notice 来显示检测到的 locale 和最终选择的翻译键
            const usedLocaleKey = Object.keys(locales).find(key => locales[key] === this.t) || 'unknown';
            // new Notice(`Detected: ${locale}, Using: ${usedLocaleKey}`); // <-- 移除测试 Notice

            // 添加命令
            this.addCommand({
                id: 'apply-ignore-rules',
                name: this.t.commands.applyRules,
                callback: async () => {
                    await this.applyRules();
                },
            });

            this.addCommand({
                id: 'add-dot-prefix',
                name: this.t.commands.addDot,
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
                name: this.t.commands.removeDot,
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

            // 添加右键菜单
            this.registerEvent(
                this.app.workspace.on('file-menu', (menu, file) => {
                    if (file instanceof TFile || file instanceof TFolder) {
                        menu.addItem((item) => {
                            const isHidden = file.path.startsWith('.');
                            item
                                .setTitle(isHidden ? this.t.menu.show : this.t.menu.hide)
                                .setIcon(isHidden ? 'eye' : 'eye-off')
                                .onClick(async () => {
                                    if (isHidden) {
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
                const itemType = file instanceof TFolder ? this.t.notice.folder : this.t.notice.file;
                new Notice(this.t.notice.hidden.replace('{itemType}', itemType));
                this.app.workspace.requestSaveLayout();
            }
        } catch (error) {
            console.error('隐藏失败:', error);
            new Notice(this.t.notice.hideError);
        }
    }

    async removeDotPrefix(file: TFile | TFolder) {
        try {
            const fileInfo = this.localFs?.getFileInfo(file.path);
            if (fileInfo) {
                await this.fileOps?.addDotPrefix(fileInfo, false);
                const itemType = file instanceof TFolder ? this.t.notice.folder : this.t.notice.file;
                new Notice(this.t.notice.shown.replace('{itemType}', itemType));
                this.app.workspace.requestSaveLayout();
            }
        } catch (error) {
            console.error('显示失败:', error);
            new Notice(this.t.notice.showError);
        }
    }

    async applyRules(isAdd: boolean = true) {
        try {
            if (!this.fileOps) {
                throw new Error('FileOperations 未初始化');
            }

            const rules = this.settings.rules
                .split('\n')
                .map((line: string) => line.trim())
                .filter((line: string) => line && !line.startsWith('#'));

            if (!rules.length) {
                new Notice(this.t.notice.noRules);
                return;
            }

            const files = await this.fileOps.getFilesToProcess(rules);

            // 只输出匹配结果
            console.log('[file-ignore] 匹配到的文件:',
                files.map(f => f.isDirectory ? f.path + '/' : f.path));

            if (files.length === 0) {
                new Notice(this.t.notice.noMatches);
                return;
            }

            for (const file of files) {
                await this.fileOps.addDotPrefix(file, isAdd);
            }

            const noticeMessage = isAdd ? this.t.notice.applied(files.length) : this.t.notice.reverted(files.length);
            new Notice(noticeMessage);
            // 请求 Obsidian 刷新文件列表
            this.app.workspace.requestSaveLayout();
        } catch (error) {
            console.error('[file-ignore] 应用规则时出错:', error);
            new Notice(this.t.notice.applyError(error.message));
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
} 