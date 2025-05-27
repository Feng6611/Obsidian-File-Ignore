import { App, Plugin, PluginSettingTab, Setting, Notice, TFile, TFolder } from 'obsidian';
import { FileOperations } from './fileOperations';
import { FileIgnoreSettingTab } from './settings';
import { LocalFileSystem, FileInfo } from './localFileSystem';
import { locales, type Translation } from './i18n/locales';
import moment from 'moment';

// 在文件顶部或合适位置增加接口定义
interface FileSystemAdapterExtended {
    getBasePath(): string;
}

export interface FileIgnoreSettings {
    rules: string;
    ignoredFiles: string[];
    debug?: boolean;
    rulesHistory?: string[]; // 新增：存储最近应用的规则 (最多5条)
}

export const DEFAULT_SETTINGS: FileIgnoreSettings = {
    rules: 'temp/\n*.tmp\n.DS_Store\n' + (process.platform === 'win32' ? 'Thumbs.db' : ''),
    ignoredFiles: [],
    debug: false,
    rulesHistory: [], // 初始化为空数组
};

export default class FileIgnorePlugin extends Plugin {
    settings: FileIgnoreSettings;
    fileOps: FileOperations | undefined;
    localFs: LocalFileSystem | undefined;
    t: Translation;

    private initTranslations() {
        const obsidianLang = moment.locale();
        let langKey: keyof typeof locales = 'en'; // Default to English

        if (obsidianLang.startsWith('zh')) {
            langKey = (obsidianLang === 'zh-tw' || obsidianLang === 'zh-hk') ? 'zh-TW' : 'zh-CN';
        } else if (locales.hasOwnProperty(obsidianLang)) {
            langKey = obsidianLang as keyof typeof locales;
        }
        this.t = locales[langKey];

        if (this.settings.debug) {
            console.log(`[file-ignore] Obsidian language: ${obsidianLang}, Using translation: ${langKey}`);
        }
    }

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

            // 3. 初始化国际化
            this.initTranslations();

            // 4. 初始化文件系统
            const adapter = (this.app.vault.adapter as unknown) as FileSystemAdapterExtended;
            const basePath = adapter.getBasePath();

            if (this.settings.debug) {
                console.log('[file-ignore] 设置加载完成:', this.settings);
                console.log('[file-ignore] FileOperations 初始化完成');
                console.log('[file-ignore] LocalFileSystem 初始化完成, 根目录:', basePath);
            }

            // 5. 初始化其他组件
            this.fileOps = new FileOperations(this.app.vault);
            this.localFs = new LocalFileSystem(basePath);

            // 6. 添加设置标签页
            this.addSettingTab(new FileIgnoreSettingTab(this.app, this));

            // 7. 初始化翻译 （新增）
            // const locale = moment.locale(); // <-- 使用 Obsidian 的 locale

            // if (locale.startsWith('zh')) {
            //     if (locale === 'zh-tw' || locale === 'zh-hk') {
            //         this.t = locales['zh-TW'];
            //     } else {
            //         this.t = locales['zh-CN'];
            //     }
            // } else if (locale === 'ja') {
            //     this.t = locales.ja;
            // } else {
            //     this.t = locales.en;
            // }
            // if (this.settings.debug) {
            //     console.log('[file-ignore] Main locale:', locale);
            // }

            // 在这里添加 Notice 来显示检测到的 locale 和最终选择的翻译键
            // const usedLocaleKey = Object.keys(locales).find(key => locales[key] === this.t) || 'unknown';
            // new Notice(`Detected: ${locale}, Using: ${usedLocaleKey}`); // <-- 移除测试 Notice

            // 添加命令
            this.addCommand({
                id: 'apply-ignore-rules',
                name: this.t.commands.applyRules,
                callback: async () => {
                    await this.applyRules(true);
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
        if (!this.settings.rulesHistory) {
            this.settings.rulesHistory = [];
        }
    }

    async saveSettings(rulesToSave?: string, addToHistory: boolean = false) {
        if (rulesToSave !== undefined) {
            this.settings.rules = rulesToSave;
        }

        // 只在 addToHistory 为 true，并且 settings.rules 有实际内容时才操作历史记录
        if (addToHistory && this.settings.rules && this.settings.rules.trim() !== "") {
            if (!this.settings.rulesHistory) {
                this.settings.rulesHistory = [];
            }
            // 移除历史中已存在的相同规则，再添加到最前面
            this.settings.rulesHistory = this.settings.rulesHistory.filter(r => r !== this.settings.rules);
            this.settings.rulesHistory.unshift(this.settings.rules);

            // 保持历史记录最多为5条
            if (this.settings.rulesHistory.length > 5) {
                this.settings.rulesHistory = this.settings.rulesHistory.slice(0, 5);
            }
        }

        await this.saveData(this.settings);

        if (this.fileOps) {
            this.fileOps.setDebug(this.settings.debug || false);
        }
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

    async applyRules(hide: boolean) {
        if (!this.fileOps) {
            new Notice(this.t.notice.settingsErrorInit);
            return;
        }
        try {
            const currentRulesText = this.settings.rules; // 获取当前规则文本以供保存到历史
            const currentRulesArray = currentRulesText.split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('#'));

            if (currentRulesArray.length === 0) {
                new Notice(this.t.notice.noRules);
                return;
            }

            const filesToProcess = await this.fileOps.getFilesToProcess(currentRulesArray);
            if (filesToProcess.length === 0) {
                new Notice(this.t.notice.noMatches);
                return;
            }

            let changedCount = 0;
            let result: { success: boolean; error?: string } | undefined;

            for (const fileInfo of filesToProcess) {
                const shouldHide = hide && !fileInfo.path.startsWith('.');
                const shouldShow = !hide && fileInfo.path.startsWith('.');
                result = undefined;

                if (shouldHide) {
                    result = await this.fileOps.addDotPrefix(fileInfo, true);
                } else if (shouldShow) {
                    result = await this.fileOps.addDotPrefix(fileInfo, false);
                }

                if (result) {
                    if (result.success) {
                        changedCount++;
                    } else {
                        const errorMessage = result.error || this.t.notice.unknownError || 'Unknown error during file operation';
                        new Notice(`${this.t.notice[hide ? 'hideError' : 'showError']} ${fileInfo.path}: ${errorMessage}`);
                    }
                }
            }

            if (changedCount > 0) {
                new Notice(hide ? this.t.notice.applied(changedCount) : this.t.notice.reverted(changedCount));
                // 既然规则被实际应用并导致了文件更改，确保当前规则在历史记录中
                // 使用 currentRulesText，因为 this.settings.rules 可能在异步操作中被其他地方修改
                await this.saveSettings(currentRulesText, true);
            } else {
                new Notice(this.t.notice.noActionNeeded);
            }

        } catch (error) {
            console.error('[file-ignore] Error in applyRules:', error);
            new Notice(this.t.notice.applyError(error.message));
        }
    }

    async rollback() {
        try {
            // Assuming fileOps.rollback() handles the core logic of undoing changes.
            await this.fileOps?.rollback();
            new Notice(this.t.notice.rollbackSuccess);
            // Correctly refresh the file explorer
            this.app.workspace.requestSaveLayout();
        } catch (error) {
            console.error('[file-ignore] Rollback operation failed:', error);
            new Notice(this.t.notice.rollbackError(error.message || this.t.notice.unknownError));
            // Do not rethrow here for the same reasons as applyRules
        }
    }
} 