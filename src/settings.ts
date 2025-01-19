import { App, PluginSettingTab, Setting, TextAreaComponent, ButtonComponent, Notice } from 'obsidian';
import type ObsidianIgnore from './main';

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

    constructor(app: App, plugin: ObsidianIgnore) {
        super(app, plugin);
        this.plugin = plugin;
    }

    async display(): Promise<void> {
        const { containerEl } = this;
        containerEl.empty();

        // 标题
        containerEl.createEl('h2', { text: 'ObsidianIgnore 设置' });

        // 1. 应用规则按钮
        new Setting(containerEl)
            .setName('应用规则')
            .setDesc('为匹配的文件添加点前缀，使其在 Obsidian 中隐藏')
            .addButton(button => button
                .setButtonText('应用规则')
                .onClick(async () => {
                    try {
                        if (!this.plugin.fileOps) {
                            throw new Error('FileOperations 未初始化');
                        }
                        await this.plugin.applyRules(true);
                        new Notice('规则已应用');
                    } catch (err) {
                        console.error('[ObsidianIgnore] 应用规则时出错:', err);
                        new Notice('应用规则时出错: ' + err.message);
                    }
                    await this.updateMatchedFiles();
                }));

        // 2. 撤销规则按钮
        new Setting(containerEl)
            .setName('撤销规则')
            .setDesc('为匹配的文件移除点前缀，使其在 Obsidian 中显示')
            .addButton(button => button
                .setButtonText('撤销规则')
                .onClick(async () => {
                    try {
                        if (!this.plugin.fileOps) {
                            throw new Error('FileOperations 未初始化');
                        }
                        await this.plugin.applyRules(false);
                        new Notice('规则已撤销');
                    } catch (err) {
                        console.error('[ObsidianIgnore] 撤销规则时出错:', err);
                        new Notice('撤销规则时出错: ' + err.message);
                    }
                    await this.updateMatchedFiles();
                }));

        // 3. 忽略规则设置
        new Setting(containerEl)
            .setName('忽略规则')
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
        descContainer.createSpan({ text: '支持的规则格式（每行一条）:' });
        const formatList = descContainer.createDiv();
        formatList.style.marginTop = '8px';
        formatList.style.marginLeft = '8px';

        [
            '具体文件：test.md',
            '文件类型：*.pdf',
            '排除规则：!docs/*.pdf',
            '文件夹：temp/'
        ].forEach(text => {
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
        this.rulesTextArea = new TextAreaComponent(textAreaContainer)
            .setValue(this.plugin.settings.rules || 'node_modules/\nsrc/')
            .onChange(async (value) => {
                this.plugin.settings.rules = value;
                await this.plugin.saveSettings();
                await this.updateMatchedFiles();
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
            text: '当前匹配的文件',
            cls: 'setting-item-name'
        }).style.margin = '0';

        // 文件列表容器
        const filesListContainer = matchedFilesContainer.createDiv('matched-files-list-container');
        filesListContainer.style.padding = '12px';
        filesListContainer.style.overflowY = 'auto';
        filesListContainer.style.flex = '1';
        filesListContainer.style.backgroundColor = 'var(--background-modifier-form-field)';

        this.createMatchedFilesList(filesListContainer);
    }

    private async updateMatchedFiles() {
        const matchedFilesEl = this.containerEl.querySelector('.matched-files');
        if (matchedFilesEl instanceof HTMLElement && matchedFilesEl.parentElement instanceof HTMLElement) {
            matchedFilesEl.empty();
            await this.createMatchedFilesList(matchedFilesEl.parentElement);
        }
    }

    private async createMatchedFilesList(container: HTMLElement) {
        const rules = this.plugin.settings.rules.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'));
        const matchedFiles = await this.plugin.fileOps.getFilesToProcess(rules);
        const listEl = container.createDiv('matched-files');

        if (matchedFiles.length === 0) {
            const noMatchesEl = listEl.createEl('p', {
                text: '没有匹配的项目',
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