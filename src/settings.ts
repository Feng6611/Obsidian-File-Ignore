import { App, PluginSettingTab, Setting, TextAreaComponent, ButtonComponent, Notice } from 'obsidian';
import type FileIgnorePlugin from './main';
import { locales, type Translation } from './i18n/locales';
import { debounce } from "obsidian";
import moment from 'moment';
import type { FileInfo } from './localFileSystem';

export interface FileIgnoreSettings {
    rules: string;  // 保持为字符串类型，存储原始文本
    debug: boolean;
}

export const DEFAULT_SETTINGS: FileIgnoreSettings = {
    rules: 'node_modules/\nsrc/',
    debug: false  // 默认关闭调试模式
}

export class FileIgnoreSettingTab extends PluginSettingTab {
    plugin: FileIgnorePlugin;
    rulesTextArea: TextAreaComponent;
    t: Translation;
    private debouncedUpdateMatchedFiles: () => void;

    constructor(app: App, plugin: FileIgnorePlugin) {
        super(app, plugin);
        this.plugin = plugin;

        // 获取系统语言设置
        const locale = moment.locale();

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

        // 修改 debounce 的实现
        this.debouncedUpdateMatchedFiles = debounce(
            () => {
                this.updateDisplayAsync();  // 移除 async/await
            },
            1500
        );

        // 调试用：打印当前使用的语言
        if (this.plugin.settings.debug) {
            console.log('[file-ignore] Current locale:', locale);
        }
    }

    // 创建一个 debounced 保存函数
    saveSettings = debounce(async (value: string) => {
        this.plugin.settings.rules = value;
        await this.plugin.saveSettings();
        // console.log("Settings saved via debounce"); // 可选：用于调试
    }, 500, false); // 延迟 500ms 保存

    // Debounced function to update the display
    debouncedUpdateDisplay = debounce(() => {
        this.updateDisplayAsync();
    }, 600, false); // 600ms delay, slightly after save debounce

    // 核心异步更新函数：获取数据并调用渲染函数
    private async updateDisplayAsync() {
        // 获取容器引用
        const statusContainer = this.containerEl.querySelector('.file-ignore-status-inline-container') as HTMLElement;
        const listContainer = this.containerEl.querySelector('.file-ignore-matched-files-list-container') as HTMLElement;

        if (!statusContainer || !listContainer) return; // 容器未找到则退出

        // 先渲染加载状态
        this.renderStatusInfo(statusContainer, null, null); // null 表示加载中
        this.renderMatchedFilesList(listContainer, null, null); // null 表示加载中

        let matchedFiles: FileInfo[] | null = null;
        let hiddenCount: number | null = null;
        let error: Error | null = null;

        try {
            if (!this.plugin.fileOps) {
                throw new Error(this.t.notice.settingsErrorInit);
            }
            // 获取当前规则
            const currentRules = this.plugin.settings.rules.split('\n')
                .map((line: string) => line.trim())
                .filter((line: string) => line && !line.startsWith('#'));

            // *** 统一获取匹配文件 ***
            matchedFiles = await this.plugin.fileOps.getFilesToProcess(currentRules);

            // *** 计算隐藏数量 ***
            hiddenCount = matchedFiles.filter(file => file.path.startsWith('.')).length;

        } catch (e) {
            console.error('[file-ignore] Error updating display:', e);
            error = e instanceof Error ? e : new Error(String(e));
        }

        // *** 统一调用渲染函数更新UI ***
        this.renderStatusInfo(statusContainer, hiddenCount, error);
        this.renderMatchedFilesList(listContainer, matchedFiles, error);
    }

    // 修改为普通的 Promise 方法，调用新的异步函数
    private async updateMatchedFiles() {
        // 保持 debounce
        this.debouncedUpdateMatchedFiles();
        // this.updateDisplayAsync(); // debounce 会调用 updateDisplayAsync
        return Promise.resolve();
    }

    // 用于立即更新的方法，调用新的异步函数
    private async updateMatchedFilesImmediate() {
        await this.updateDisplayAsync();
    }

    async display(): Promise<void> {
        const { containerEl } = this;
        containerEl.empty();

        // 标题和描述
        containerEl.createEl('h2', { text: this.t.settingsTitle, cls: 'file-ignore-settings-title' });

        // --- 合并顶部操作区域 ---
        const topActionRow = containerEl.createDiv('file-ignore-top-action-row');

        // 状态指示器容器 (直接放在行内)
        const statusContainer = topActionRow.createDiv('file-ignore-status-inline-container');
        // 初始调用更新
        this.updateDisplayAsync();

        // 按钮容器 (直接放在行内)
        const buttonGroup = topActionRow.createDiv('file-ignore-button-group');

        // 隐藏按钮
        const hideButton = new ButtonComponent(buttonGroup)
            .setButtonText(this.t.applyRules.button)
            .setCta()
            .setTooltip(this.t.applyRules.desc) // 使用 tooltip 显示描述
            .onClick(async () => {
                hideButton.setDisabled(true).setButtonText(this.t.applyRules.button + '...');
                try {
                    if (!this.plugin.fileOps) throw new Error(this.t.notice.settingsErrorInit);
                    await this.plugin.applyRules(true);
                    new Notice(this.t.applyRules.success);
                } catch (err) {
                    console.error('[file-ignore]', err);
                    new Notice(this.t.applyRules.error + err.message);
                } finally {
                    hideButton.setDisabled(false).setButtonText(this.t.applyRules.button);
                    this.updateDisplayAsync(); // 统一调用更新
                }
            });

        // 显示按钮
        const showButton = new ButtonComponent(buttonGroup)
            .setButtonText(this.t.revertRules.button)
            .setTooltip(this.t.revertRules.desc) // 使用 tooltip 显示描述
            .onClick(async () => {
                showButton.setDisabled(true).setButtonText(this.t.revertRules.button + '...');
                try {
                    if (!this.plugin.fileOps) throw new Error(this.t.notice.settingsErrorInit);
                    await this.plugin.applyRules(false);
                    new Notice(this.t.revertRules.success);
                } catch (err) {
                    console.error('[file-ignore]', err);
                    new Notice(this.t.revertRules.error + err.message);
                } finally {
                    showButton.setDisabled(false).setButtonText(this.t.revertRules.button);
                    this.updateDisplayAsync(); // 统一调用更新
                }
            });
        // --- 合并结束 ---

        // 3. 忽略规则设置
        new Setting(containerEl)
            .setName(this.t.ignoreRules.title)
            .setHeading();

        // --- 调整下半部分布局 ---
        // 规则格式说明 (单独一行)
        const ruleFormatContainer = containerEl.createDiv('file-ignore-rule-format-container');
        const formatDescContainer = ruleFormatContainer.createDiv('setting-item-description');
        formatDescContainer.createSpan({ text: this.t.ignoreRules.formatTitle, cls: 'file-ignore-format-title' });
        const formatList = formatDescContainer.createDiv('file-ignore-format-list');
        this.t.ignoreRules.formats.forEach(text => {
            const item = formatList.createDiv('file-ignore-format-list-item');
            item.createSpan({ text: '• ' + text });
        });

        // 主容器 (现在是左右布局)
        const mainContainer = containerEl.createDiv('file-ignore-main-row-container'); // 重命名 class

        // 左侧面板 (规则输入)
        const leftPanel = mainContainer.createDiv('file-ignore-input-panel');

        // --- 调整：左侧面板标题和按钮容器 ---
        const leftTitleContainer = leftPanel.createDiv('file-ignore-panel-title-container'); // 容器现在包含标题和按钮
        leftTitleContainer.createEl('p', {
            text: this.t.ignoreRules.title, // "Ignore Rules"
            cls: 'setting-item-name file-ignore-panel-title'
        });

        // --- 移动：规则操作按钮 (Reset, All Files) 到标题容器内 ---
        const ruleActionsContainer = leftTitleContainer.createDiv('file-ignore-rule-actions'); // 在标题容器内创建按钮容器
        // Reset 按钮
        new ButtonComponent(ruleActionsContainer)
            .setButtonText(this.t.ignoreRules.resetButton)
            .setTooltip('Restore default rules')
            .setClass('file-ignore-small-button')
            .onClick(() => {
                this.rulesTextArea.setValue(DEFAULT_SETTINGS.rules);
                this.rulesTextArea.onChanged(); // Trigger update
            });

        // All Files 按钮
        new ButtonComponent(ruleActionsContainer)
            .setButtonText(this.t.ignoreRules.allFilesButton)
            .setTooltip('Add all root files/folders to the rules')
            .setClass('file-ignore-small-button')
            .onClick(async () => {
                try {
                    if (!this.plugin.localFs) {
                        new Notice('Local file system not available.');
                        return;
                    }
                    const rootItems = await this.plugin.localFs.listDirectory(); // Assuming this lists root
                    const existingRules = this.rulesTextArea.getValue().split('\n').filter(r => r.trim() !== '');
                    const newRules = rootItems.map(item => item.isDirectory ? `${item.path}/` : item.path);
                    // 合并并去重
                    const combinedRules = [...new Set([...existingRules, ...newRules])];
                    this.rulesTextArea.setValue(combinedRules.join('\n'));
                    this.rulesTextArea.onChanged(); // Trigger update
                } catch (error) {
                    console.error('[file-ignore] Error adding all files:', error);
                    new Notice('Failed to add all files.');
                }
            });
        // --- 移动和调整结束 ---

        // 左侧：规则输入框容器 (位置不变，但在布局流中会在标题容器之后)
        const textAreaContainer = leftPanel.createDiv('file-ignore-rules-textarea-container');
        this.rulesTextArea = new TextAreaComponent(textAreaContainer);
        this.rulesTextArea.inputEl.addClass('file-ignore-rules-textarea');
        this.rulesTextArea.inputEl.setAttribute('rows', '20'); // 增加更多高度
        this.rulesTextArea.inputEl.setAttribute('placeholder', '输入规则，每行一个'); // 添加占位文本
        this.rulesTextArea.setValue(this.plugin.settings.rules || DEFAULT_SETTINGS.rules);
        // 修改 onChange 回调
        this.rulesTextArea.onChange((value) => {
            this.saveSettings(value); // Trigger debounced save
            this.debouncedUpdateDisplay(); // Trigger debounced update
        });

        // 右侧面板 (匹配文件)
        const rightPanel = mainContainer.createDiv('file-ignore-matched-panel'); // 重命名 class
        const matchedFilesContainer = rightPanel.createDiv('file-ignore-matched-files-outer-container');
        const titleContainer = matchedFilesContainer.createDiv('file-ignore-matched-files-title-container');
        titleContainer.createEl('p', {
            text: this.t.ignoreRules.matchedFiles,
            cls: 'setting-item-name file-ignore-matched-files-title'
        });
        const filesListContainer = matchedFilesContainer.createDiv('file-ignore-matched-files-list-container');
        // 先显示加载提示
        this.showLoading(filesListContainer);

        // 初始化时立即更新匹配文件列表 (改为异步)
        // await this.updateMatchedFilesImmediate();
        this.updateMatchedFilesImmediate(); // 不再 await
    }

    private showLoading(container: HTMLElement) {
        container.empty();
        container.createEl('div', {
            text: this.t.notice.loading,
            cls: 'setting-item-description file-ignore-loading'
        });
    }

    // Private method to render the matched files list based on calculated data
    private renderMatchedFilesList(container: HTMLElement, matchedFiles: FileInfo[] | null, error: Error | null) {
        container.empty();

        if (error) {
            // 显示错误信息
            container.createEl('p', {
                text: `Error loading list: ${error.message}`,
                cls: 'setting-item-description file-ignore-no-matches mod-error'
            });
            return;
        }

        if (matchedFiles === null) {
            // 显示加载状态
            container.createEl('div', {
                text: this.t.notice.loading,
                cls: 'setting-item-description file-ignore-loading'
            });
            return;
        }

        // 以下是渲染列表的逻辑，基本不变
        const listEl = container.createDiv('file-ignore-matched-files');

        if (matchedFiles.length === 0) {
            const noMatchesEl = listEl.createEl('p', {
                text: this.t.ignoreRules.noMatches,
                cls: 'setting-item-description file-ignore-no-matches'
            });
            return;
        }

        // 添加匹配文件数量信息
        const countInfo = listEl.createEl('p', {
            text: `${matchedFiles.length} ${matchedFiles.length > 1 ? 'items' : 'item'} matched`,
            cls: 'file-ignore-count-info'
        });

        // 创建简化的列表
        const filesContainer = listEl.createDiv('file-ignore-matched-files-simplified');

        // 对匹配的文件排序
        const sortedFiles = [...matchedFiles].sort((a, b) => {
            if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
            return a.path.localeCompare(b.path);
        });

        // 渲染列表项
        sortedFiles.forEach(file => {
            const isFolder = file.isDirectory;
            const fileItem = filesContainer.createDiv(`file-ignore-file-item ${isFolder ? 'file-ignore-folder-item' : 'file-ignore-regular-item'}`);
            const displayPath = isFolder ? file.path + '/' : file.path;
            const pathEl = fileItem.createSpan('file-ignore-item-path');
            pathEl.setText(displayPath);
            fileItem.addEventListener('click', () => {
                if (isFolder) {
                    new Notice(`Folder: ${file.path}`);
                } else {
                    this.app.workspace.openLinkText(file.path, '');
                }
            });
        });
    }

    // Private method to render the status info based on calculated data
    private renderStatusInfo(container: HTMLElement, hiddenCount: number | null, error: Error | null) {
        container.empty();
        const statusEl = container.createDiv('file-ignore-status-info');
        const iconContainer = statusEl.createSpan('file-ignore-status-icon');
        const textContainer = statusEl.createSpan('file-ignore-status-text');

        if (error) {
            // 显示错误状态
            iconContainer.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'; // Error icon
            textContainer.setText(`Error: ${error.message}`);
            statusEl.addClass('mod-error');
        } else if (hiddenCount === null) {
            // 显示加载状态
            statusEl.addClass('file-ignore-loading');
            iconContainer.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>'; // Loading icon
            textContainer.setText(this.t.notice.loading);
        } else if (hiddenCount > 0) {
            // 显示隐藏状态
            iconContainer.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
            textContainer.setText(this.t.notice.statusHidden(hiddenCount));
        } else {
            // 显示无隐藏状态
            iconContainer.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
            textContainer.setText(this.t.notice.statusNotHidden);
        }
    }

    // 删除旧的异步 addStatusInfo 方法
    /*
    private async addStatusInfo(container: HTMLElement) {
        // ... old implementation ...
    }
    */
} 