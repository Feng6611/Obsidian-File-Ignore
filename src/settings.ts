import { App, PluginSettingTab, Setting, TextAreaComponent, ButtonComponent, Notice } from 'obsidian';
import type ObsidianIgnore from './main';

export interface ObsidianIgnoreSettings {
    rules: string;  // 保持为字符串类型，存储原始文本
    debug: boolean;
}

export const DEFAULT_SETTINGS: ObsidianIgnoreSettings = {
    rules: '# 在此输入规则，每行一条\n# 例如：\ntest.md\n*.pdf\n!docs/*.pdf\ntemp/',
    debug: true  // 默认开启调试模式，方便排查问题
}

export class ObsidianIgnoreSettingTab extends PluginSettingTab {
    plugin: ObsidianIgnore;
    rulesTextArea: TextAreaComponent;

    constructor(app: App, plugin: ObsidianIgnore) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // 标题
        containerEl.createEl('h2', { text: 'ObsidianIgnore 设置' });

        // 规则配置区域
        new Setting(containerEl)
            .setName('忽略规则')
            .setDesc('每行输入一条规则，支持 glob 模式，以 # 开头的行为注释')
            .addTextArea(text => {
                this.rulesTextArea = text;
                text
                    .setValue(this.plugin.settings.rules)
                    .setPlaceholder('输入规则...')
                    .onChange(async (value) => {
                        this.plugin.settings.rules = value;
                        await this.plugin.saveSettings();
                        // 实时更新匹配的文件列表
                        await this.updateMatchedFiles();
                    });
                text.inputEl.rows = 10;
                text.inputEl.cols = 50;
            });

        // 调试模式开关
        new Setting(containerEl)
            .setName('调试模式')
            .setDesc('启用后将在控制台显示详细日志')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.debug)
                .onChange(async (value) => {
                    this.plugin.settings.debug = value;
                    await this.plugin.saveSettings();
                }));

        // 操作按钮区域
        const buttonContainer = containerEl.createDiv('button-container');
        buttonContainer.style.marginTop = '20px';

        // 应用规则按钮
        new Setting(buttonContainer)
            .setName('应用规则')
            .setDesc('为匹配的文件添加点前缀，使其在 Obsidian 中隐藏')
            .addButton(button => button
                .setButtonText('应用规则')
                .onClick(async () => {
                    console.log('[ObsidianIgnore] 点击应用规则按钮');
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

        // 撤销规则按钮
        new Setting(buttonContainer)
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

        // 匹配文件列表区域
        containerEl.createEl('h3', { text: '当前匹配的文件' });
        this.createMatchedFilesList(containerEl);
    }

    private async updateMatchedFiles() {
        const matchedFilesEl = this.containerEl.querySelector('.matched-files');
        if (matchedFilesEl instanceof HTMLElement) {
            matchedFilesEl.empty();
            await this.createMatchedFilesList(matchedFilesEl);
        }
    }

    private async createMatchedFilesList(container: HTMLElement) {
        const rules = this.plugin.settings.rules.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'));
        const matchedFiles = await this.plugin.fileOps.getFilesToProcess(rules);
        const listEl = container.createDiv('matched-files');

        if (matchedFiles.length === 0) {
            listEl.createEl('p', { text: '没有匹配的文件' });
            return;
        }

        const ul = listEl.createEl('ul');
        matchedFiles.forEach(file => {
            const li = ul.createEl('li');
            li.createEl('span', { text: file.path });
        });
    }
} 