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
        // 获取 Obsidian 当前语言设置
        const locale = (window as any).localStorage.getItem('language') || 'en';
        // 根据语言代码选择对应的翻译
        if (locale.startsWith('zh')) {
            // 检查是否为繁体中文
            if (locale === 'zh-TW' || locale === 'zh-HK') {
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
            console.log('[ObsidianIgnore] Current locale:', locale);
        }
    }

    // 立即更新匹配文件列表的方法
    private async updateMatchedFilesImpl() {
        const filesListContainer = this.containerEl.querySelector('.matched-files-list-container');
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
                        console.error('[ObsidianIgnore]', err);
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
                        console.error('[ObsidianIgnore]', err);
                        new Notice(this.t.revertRules.error + err.message);
                    }
                    await this.updateMatchedFiles();
                }));

        // 3. 忽略规则设置
        new Setting(containerEl)
            .setName(this.t.ignoreRules.title)
            .setHeading();

        // 创建主容器
        const mainContainer = containerEl.createDiv('main-container');
        mainContainer.style.display = 'flex';
        mainContainer.style.gap = '20px';
        mainContainer.style.marginTop = '12px';
        mainContainer.style.height = '400px';  // 设置整体高度

        // 左侧面板
        const leftPanel = mainContainer.createDiv('left-panel');
        leftPanel.style.flex = '1';
        leftPanel.style.display = 'flex';
        leftPanel.style.flexDirection = 'column';

        // 左侧：规则说明
        const rulesDescContainer = leftPanel.createDiv('rules-desc-container');
        rulesDescContainer.style.marginBottom = '12px';

        const descContainer = rulesDescContainer.createDiv('setting-item-description');
        descContainer.createSpan({ text: this.t.ignoreRules.formatTitle });
        const formatList = descContainer.createDiv();
        formatList.style.marginTop = '8px';
        formatList.style.marginLeft = '8px';

        this.t.ignoreRules.formats.forEach(text => {
            const item = formatList.createDiv();
            item.style.marginBottom = '4px';
            item.createSpan({ text: '• ' + text });
        });

        // 左侧：规则输入框容器
        const textAreaContainer = leftPanel.createDiv('rules-textarea-container');
        textAreaContainer.style.flex = '1';
        textAreaContainer.style.display = 'flex';
        textAreaContainer.style.flexDirection = 'column';
        textAreaContainer.style.border = '1px solid var(--background-modifier-border)';
        textAreaContainer.style.borderRadius = '4px';
        textAreaContainer.style.backgroundColor = 'var(--background-primary)';
        textAreaContainer.style.overflow = 'hidden';

        // 规则输入框
        this.rulesTextArea = new TextAreaComponent(textAreaContainer);

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

        const textAreaEl = this.rulesTextArea.inputEl;
        textAreaEl.style.width = '100%';
        textAreaEl.style.height = '100%';
        textAreaEl.style.border = 'none';
        textAreaEl.style.borderRadius = '4px';
        textAreaEl.style.padding = '12px';
        textAreaEl.style.resize = 'none';
        textAreaEl.style.minHeight = '200px';
        textAreaEl.style.backgroundColor = 'var(--background-modifier-form-field)';

        // 右侧面板
        const rightPanel = mainContainer.createDiv('right-panel');
        rightPanel.style.flex = '1';
        rightPanel.style.display = 'flex';
        rightPanel.style.flexDirection = 'column';

        // 右侧：匹配文件容器
        const matchedFilesContainer = rightPanel.createDiv('matched-files-outer-container');
        matchedFilesContainer.style.flex = '1';
        matchedFilesContainer.style.border = '1px solid var(--background-modifier-border)';
        matchedFilesContainer.style.borderRadius = 'var(--input-radius)';
        matchedFilesContainer.style.backgroundColor = 'var(--background-secondary)';
        matchedFilesContainer.style.display = 'flex';
        matchedFilesContainer.style.flexDirection = 'column';
        matchedFilesContainer.style.overflow = 'hidden';

        // 标题放在框内
        const titleContainer = matchedFilesContainer.createDiv('matched-files-title-container');
        titleContainer.style.padding = '12px';
        titleContainer.style.backgroundColor = 'var(--background-modifier-form-field)';
        titleContainer.createEl('p', {
            text: this.t.ignoreRules.matchedFiles,
            cls: 'setting-item-name'
        }).style.margin = '0';

        // 文件列表容器
        const filesListContainer = matchedFilesContainer.createDiv('matched-files-list-container');
        filesListContainer.style.padding = '12px';
        filesListContainer.style.overflowY = 'auto';
        filesListContainer.style.flex = '1';
        filesListContainer.style.backgroundColor = 'var(--background-modifier-form-field)';

        // 初始化时立即更新匹配文件列表
        await this.updateMatchedFilesImmediate();
    }

    private async createMatchedFilesList(container: HTMLElement) {
        // 清空现有内容
        container.empty();

        // 确保使用当前的规则进行匹配
        const currentRules = this.plugin.settings.rules.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'));

        const matchedFiles = await this.plugin.fileOps.getFilesToProcess(currentRules);
        const listEl = container.createDiv('matched-files');

        if (matchedFiles.length === 0) {
            const noMatchesEl = listEl.createEl('p', {
                text: this.t.ignoreRules.noMatches,
                cls: 'setting-item-description'
            });
            noMatchesEl.style.textAlign = 'center';
            noMatchesEl.style.margin = '0';
            return;
        }

        const filesContainer = listEl.createDiv('setting-item-description');
        filesContainer.style.display = 'flex';
        filesContainer.style.flexDirection = 'column';
        filesContainer.style.gap = '8px';

        matchedFiles.forEach(file => {
            const fileItem = filesContainer.createDiv();
            const displayPath = file.isDirectory ? file.path + '/' : file.path;
            fileItem.createSpan({ text: displayPath });
        });
    }
} 