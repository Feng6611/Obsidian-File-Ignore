import { App, PluginSettingTab, Setting, TextAreaComponent, ButtonComponent, Notice } from 'obsidian';
import type ObsidianIgnore from './main';
import { locales, type Translation } from './i18n/locales';
import { debounce } from './utils/debounce';

export interface ObsidianIgnoreSettings {
    rules: string;  // 保持为字符串类型，存储原始文本
    debug: boolean;
}

export const DEFAULT_SETTINGS: ObsidianIgnoreSettings = {
    rules: 'node_modules/\nsrc/',
    debug: true  // 默认开启调试模式
}

export class ObsidianIgnoreSettingTab extends PluginSettingTab {
    plugin: ObsidianIgnore;
    rulesTextArea: TextAreaComponent;
    t: Translation;
    private debouncedUpdateMatchedFiles: () => Promise<void>;

    constructor(app: App, plugin: ObsidianIgnore) {
        super(app, plugin);
        this.plugin = plugin;

        // 获取系统语言设置
        const locale = navigator.language.toLowerCase() || 'en';

        // 根据语言代码选择对应的翻译
        if (locale.startsWith('zh')) {
            // 检查是否为繁体中文
            if (locale === 'zh-tw' || locale === 'zh-hk') {
                this.t = locales['zh-TW'];
            } else {
                // 其他中文默认使用简体中文
                this.t = locales['zh-CN'];
            }
        } else if (locale === 'ja') {
            this.t = locales.ja;
        } else {
            // 默认使用英文
            this.t = locales.en;
        }

        // 初始化防抖函数，设置 1.5s 延迟
        this.debouncedUpdateMatchedFiles = debounce(
            async () => {
                await this.updateMatchedFilesImpl();
            },
            1500
        );

        // 调试用：打印当前使用的语言
        if (this.plugin.settings.debug) {
            console.log('[file-ignore] Current locale:', locale);
        }
    }

    // 立即更新匹配文件列表的方法
    private async updateMatchedFilesImpl() {
        const filesListContainer = this.containerEl.querySelector('.file-ignore-matched-files-list-container');
        if (filesListContainer instanceof HTMLElement) {
            await this.createMatchedFilesList(filesListContainer);
        }
    }

    // 用于防抖更新的方法
    private async updateMatchedFiles() {
        await this.debouncedUpdateMatchedFiles();
    }

    // 用于立即更新的方法
    private async updateMatchedFilesImmediate() {
        await this.updateMatchedFilesImpl();
    }

    async display(): Promise<void> {
        const { containerEl } = this;
        containerEl.empty();

        // 标题
        containerEl.createEl('h2', { text: this.t.settingsTitle });

        // 1. 应用规则按钮
        new Setting(containerEl)
            .setName(this.t.applyRules.name)
            .setDesc(this.t.applyRules.desc)
            .addButton(button => button
                .setButtonText(this.t.applyRules.button)
                .onClick(async () => {
                    try {
                        if (!this.plugin.fileOps) {
                            throw new Error('FileOperations not initialized');
                        }
                        await this.plugin.applyRules(true);
                        new Notice(this.t.applyRules.success);
                    } catch (err) {
                        console.error('[file-ignore]', err);
                        new Notice(this.t.applyRules.error + err.message);
                    }
                    await this.updateMatchedFiles();
                }));

        // 2. 撤销规则按钮
        new Setting(containerEl)
            .setName(this.t.revertRules.name)
            .setDesc(this.t.revertRules.desc)
            .addButton(button => button
                .setButtonText(this.t.revertRules.button)
                .onClick(async () => {
                    try {
                        if (!this.plugin.fileOps) {
                            throw new Error('FileOperations not initialized');
                        }
                        await this.plugin.applyRules(false);
                        new Notice(this.t.revertRules.success);
                    } catch (err) {
                        console.error('[file-ignore]', err);
                        new Notice(this.t.revertRules.error + err.message);
                    }
                    await this.updateMatchedFiles();
                }));

        // 3. 忽略规则设置
        new Setting(containerEl)
            .setName(this.t.ignoreRules.title)
            .setHeading();

        // 创建主容器
        const mainContainer = containerEl.createDiv('file-ignore-main-container');

        // 左侧面板
        const leftPanel = mainContainer.createDiv('file-ignore-left-panel');

        // 左侧：规则说明
        const rulesDescContainer = leftPanel.createDiv('file-ignore-rules-desc-container');

        const descContainer = rulesDescContainer.createDiv('setting-item-description');
        descContainer.createSpan({ text: this.t.ignoreRules.formatTitle });
        const formatList = descContainer.createDiv('file-ignore-format-list');

        this.t.ignoreRules.formats.forEach(text => {
            const item = formatList.createDiv('file-ignore-format-list-item');
            item.createSpan({ text: '• ' + text });
        });

        // 左侧：规则输入框容器
        const textAreaContainer = leftPanel.createDiv('file-ignore-rules-textarea-container');

        // 规则输入框
        this.rulesTextArea = new TextAreaComponent(textAreaContainer);
        this.rulesTextArea.inputEl.addClass('file-ignore-rules-textarea');

        // 先设置值，此时还没有注册 onChange 事件，不会触发更新
        this.rulesTextArea.setValue(this.plugin.settings.rules || 'node_modules/\nsrc/');

        // 然后注册 onChange 事件
        this.rulesTextArea.onChange(async (value) => {
            const isResettingToDefault = value === DEFAULT_SETTINGS.rules;
            this.plugin.settings.rules = value;
            await this.plugin.saveSettings();

            // 如果是重置到默认值，立即更新
            if (isResettingToDefault) {
                await this.updateMatchedFilesImmediate();
            } else {
                await this.updateMatchedFiles();
            }
        });

        // 右侧面板
        const rightPanel = mainContainer.createDiv('file-ignore-right-panel');

        // 右侧：匹配文件容器
        const matchedFilesContainer = rightPanel.createDiv('file-ignore-matched-files-outer-container');

        // 标题放在框内
        const titleContainer = matchedFilesContainer.createDiv('file-ignore-matched-files-title-container');
        titleContainer.createEl('p', {
            text: this.t.ignoreRules.matchedFiles,
            cls: 'setting-item-name file-ignore-matched-files-title'
        });

        // 文件列表容器
        const filesListContainer = matchedFilesContainer.createDiv('file-ignore-matched-files-list-container');

        // 初始化时立即更新匹配文件列表
        await this.updateMatchedFilesImmediate();
    }

    private async createMatchedFilesList(container: HTMLElement) {
        // 清空现有内容
        container.empty();

        if (!this.plugin.fileOps) {
            const errorEl = container.createEl('p', {
                text: 'FileOperations 未初始化',
                cls: 'setting-item-description file-ignore-no-matches'
            });
            return;
        }

        // 确保使用当前的规则进行匹配
        const currentRules = this.plugin.settings.rules.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'));

        const matchedFiles = await this.plugin.fileOps.getFilesToProcess(currentRules);
        const listEl = container.createDiv('file-ignore-matched-files');

        if (matchedFiles.length === 0) {
            const noMatchesEl = listEl.createEl('p', {
                text: this.t.ignoreRules.noMatches,
                cls: 'setting-item-description file-ignore-no-matches'
            });
            return;
        }

        const filesContainer = listEl.createDiv('setting-item-description file-ignore-matched-files');

        matchedFiles.forEach(file => {
            const fileItem = filesContainer.createDiv('file-ignore-file-item');
            const displayPath = file.isDirectory ? file.path + '/' : file.path;
            fileItem.createSpan({ text: displayPath });
        });
    }
} 