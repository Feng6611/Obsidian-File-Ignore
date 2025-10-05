import { App, PluginSettingTab, Setting, TextAreaComponent, ButtonComponent, Notice, Modal } from 'obsidian';
import type FileIgnorePlugin from './main';
import { locales, type Translation } from './i18n/locales';
import { debounce } from "obsidian";
import moment from 'moment';
import type { FileInfo } from './localFileSystem';

export interface FileIgnoreSettings {
    rules: string;  // 保持为字符串类型，存储原始文本
    debug: boolean;
    rulesHistory?: string[]; // 新增：存储最近5条规则历史
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

    // For navigating applied rules history
    private appliedRulesHistoryIndex = -1;
    private prevAppliedRuleButton: ButtonComponent;
    private nextAppliedRuleButton: ButtonComponent;

    constructor(app: App, plugin: FileIgnorePlugin) {
        super(app, plugin);
        this.plugin = plugin;
        this.t = this.plugin.t;

        this.debouncedUpdateMatchedFiles = debounce(
            () => {
                this.updateDisplayAsync();
            },
            1500
        );
    }

    // saveSettings 现在只负责调用 plugin.saveSettings
    // plugin.saveSettings 会处理 rulesHistory 的更新
    saveSettings = debounce(async (value: string) => {
        await this.plugin.saveSettings(value);
        // 当规则通过文本编辑并保存后，它成为最新的"已应用"规则
        // 因此，appliedRulesHistoryIndex 应指向它 (即历史记录的第0项)
        const currentRulesInHistory = this.plugin.settings.rulesHistory || [];
        this.appliedRulesHistoryIndex = currentRulesInHistory.indexOf(value);
        // 如果刚保存的规则是全新的（之前不在历史中），它会被 unshift 到第0位
        if (this.appliedRulesHistoryIndex === -1 && currentRulesInHistory.length > 0 && currentRulesInHistory[0] === value) {
            this.appliedRulesHistoryIndex = 0;
        }
        this.updateNavigationButtonStates();
    }, 500, false);

    debouncedUpdateDisplay = debounce(() => {
        this.updateDisplayAsync();
    }, 600, false);

    private async updateDisplayAsync() {
        const statusContainer = this.containerEl.querySelector('.file-ignore-status-inline-container') as HTMLElement;
        const listContainer = this.containerEl.querySelector('.file-ignore-matched-files-list-container') as HTMLElement;

        if (!statusContainer || !listContainer) return;

        this.renderStatusInfo(statusContainer, null, null);
        this.renderMatchedFilesList(listContainer, null, null, null);

        let matchedFiles: FileInfo[] | null = null;
        let hiddenCount: number | null = null;
        let error: Error | null = null;

        try {
            if (!this.plugin.fileOps) {
                throw new Error(this.t.notice.settingsErrorInit);
            }
            const currentRules = this.plugin.settings.rules.split('\n')
                .map((line: string) => line.trim())
                .filter((line: string) => line && !line.startsWith('#'));

            matchedFiles = await this.plugin.fileOps.getFilesToProcess(currentRules);
            hiddenCount = matchedFiles.filter(file => file.path.startsWith('.')).length;
        } catch (e) {
            console.error('[file-ignore] Error updating display:', e);
            error = e instanceof Error ? e : new Error(String(e));
        }

        this.renderStatusInfo(statusContainer, hiddenCount, error);
        this.renderMatchedFilesList(listContainer, matchedFiles, hiddenCount, error);
    }

    private async updateMatchedFiles() {
        this.debouncedUpdateMatchedFiles();
        return Promise.resolve();
    }

    private async updateMatchedFilesImmediate() {
        await this.updateDisplayAsync();
    }

    private loadRuleAndRefresh(ruleText: string, newIndex: number) {
        this.rulesTextArea.setValue(ruleText);
        this.plugin.settings.rules = ruleText; // 同步内存中的当前规则，以供即时匹配显示
        this.appliedRulesHistoryIndex = newIndex;
        this.updateNavigationButtonStates();
        this.debouncedUpdateDisplay(); // 触发右侧列表更新
        new Notice(this.t.notice.ruleLoadedFromHistory || 'Rule loaded from history.');
    }

    private loadPreviousAppliedRule() {
        const history = this.plugin.settings.rulesHistory || [];
        if (history.length === 0) return;

        let newIndex;
        if (this.appliedRulesHistoryIndex === -1) { // 当前文本框内容不在历史中 (或首次导航)
            newIndex = history.length - 1; // "上一个"加载历史中的最后一条(最旧的)
        } else if (this.appliedRulesHistoryIndex > 0) {
            newIndex = this.appliedRulesHistoryIndex - 1;
        } else {
            return; // 已经是第一条或无法确定更早的
        }
        if (newIndex >= 0 && newIndex < history.length) {
            this.loadRuleAndRefresh(history[newIndex], newIndex);
        }
    }

    private loadNextAppliedRule() {
        const history = this.plugin.settings.rulesHistory || [];
        if (history.length === 0) return;

        let newIndex;
        if (this.appliedRulesHistoryIndex === -1) { // 当前文本框内容不在历史中 (或首次导航)
            newIndex = 0; // "下一个"加载历史中的第一条(最新的)
        } else if (this.appliedRulesHistoryIndex < history.length - 1) {
            newIndex = this.appliedRulesHistoryIndex + 1;
        } else {
            return; // 已经是最后一条或无法确定更新的
        }
        if (newIndex >= 0 && newIndex < history.length) {
            this.loadRuleAndRefresh(history[newIndex], newIndex);
        }
    }

    private updateNavigationButtonStates() {
        const history = this.plugin.settings.rulesHistory || [];
        const historyLength = history.length;

        if (this.prevAppliedRuleButton) {
            if (historyLength === 0) {
                this.prevAppliedRuleButton.setDisabled(true);
            } else if (this.appliedRulesHistoryIndex === -1) {
                this.prevAppliedRuleButton.setDisabled(false); // 如果不在历史中，允许跳到历史末尾
            } else {
                this.prevAppliedRuleButton.setDisabled(this.appliedRulesHistoryIndex === 0);
            }
        }
        if (this.nextAppliedRuleButton) {
            if (historyLength === 0) {
                this.nextAppliedRuleButton.setDisabled(true);
            } else if (this.appliedRulesHistoryIndex === -1) {
                this.nextAppliedRuleButton.setDisabled(false); // 如果不在历史中，允许跳到历史开头
            } else {
                this.nextAppliedRuleButton.setDisabled(this.appliedRulesHistoryIndex === historyLength - 1);
            }
        }
    }

    async display(): Promise<void> {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: this.t.settingsTitle, cls: 'file-ignore-settings-title' });

        // Ensure the initially loaded plugin rules are processed for history and auto-matching.
        const initialPluginRules = this.plugin.settings.rules;
        await this.plugin.saveSettings(initialPluginRules, true);
        // After this call:
        // 1. this.plugin.settings.rules is set (or remains initialPluginRules).
        // 2. If initialPluginRules was non-empty, it's now at the front of this.plugin.settings.rulesHistory.

        const topActionRow = containerEl.createDiv('file-ignore-top-action-row');
        const statusContainer = topActionRow.createDiv('file-ignore-status-inline-container');
        // 初始渲染固定提示文本，确保页面加载时就显示
        this.renderStatusInfo(statusContainer, null, null);

        const buttonGroup = topActionRow.createDiv('file-ignore-button-group');
        new ButtonComponent(buttonGroup)
            .setButtonText(this.t.applyRules.button)
            .setCta()
            .setTooltip(this.t.applyRules.desc)
            .onClick(async () => {
                // 确保使用当前文本框中的规则立即执行
                await this.plugin.saveSettings(this.rulesTextArea.getValue());
                const currentRules = this.plugin.settings.rules.split('\n')
                    .map((line: string) => line.trim())
                    .filter((line: string) => line && !line.startsWith('#'));
                if (!this.plugin.fileOps) return;
                const matched = await this.plugin.fileOps.getFilesToProcess(currentRules);
                const actionable = matched.filter(f => !this.plugin.fileOps!.isProtectedPath(f.path));
                const skipped = matched.length - actionable.length;
                if (actionable.length === 0) {
                    new Notice(this.t.notice.noActionNeeded);
                    return;
                }
                const ok = await this.confirmAction(true, actionable, skipped);
                if (!ok) {
                    this.updateDisplayAsync();
                    return;
                }
                await this.plugin.applyRules(true, {
                    matches: matched,
                    actionable: actionable,
                    skippedProtected: skipped
                });
                this.updateDisplayAsync();
            });

        new ButtonComponent(buttonGroup)
            .setButtonText(this.t.revertRules.button)
            .setTooltip(this.t.revertRules.desc)
            .onClick(async () => {
                // 确保使用当前文本框中的规则立即执行
                await this.plugin.saveSettings(this.rulesTextArea.getValue());
                const currentRules = this.plugin.settings.rules.split('\n')
                    .map((line: string) => line.trim())
                    .filter((line: string) => line && !line.startsWith('#'));
                if (!this.plugin.fileOps) return;
                const matched = await this.plugin.fileOps.getFilesToProcess(currentRules);
                const actionable = matched.filter(f => !this.plugin.fileOps!.isProtectedPath(f.path));
                const skipped = matched.length - actionable.length;
                if (actionable.length === 0) {
                    new Notice(this.t.notice.noActionNeeded);
                    return;
                }
                const ok = await this.confirmAction(false, actionable, skipped);
                if (!ok) {
                    this.updateDisplayAsync();
                    return;
                }
                await this.plugin.applyRules(false, {
                    matches: matched,
                    actionable: actionable,
                    skippedProtected: skipped
                });
                this.updateDisplayAsync();
            });

        new Setting(containerEl).setName(this.t.ignoreRules.title).setHeading();

        const ruleFormatContainer = containerEl.createDiv('file-ignore-rule-format-container');
        const formatDescContainer = ruleFormatContainer.createDiv('setting-item-description');
        formatDescContainer.createSpan({ text: this.t.ignoreRules.formatTitle, cls: 'file-ignore-format-title' });
        const formatList = formatDescContainer.createDiv('file-ignore-format-list');
        (this.t.ignoreRules.formats || []).forEach(text => {
            const item = formatList.createDiv('file-ignore-format-list-item');
            item.createSpan({ text: '• ' + text });
        });

        const mainContainer = containerEl.createDiv('file-ignore-main-row-container');
        const leftPanel = mainContainer.createDiv('file-ignore-input-panel');
        const leftTitleContainer = leftPanel.createDiv('file-ignore-panel-title-container');
        leftTitleContainer.createEl('p', { text: this.t.ignoreRules.rulesTitle, cls: 'setting-item-name file-ignore-panel-title' });

        // 添加主操作按钮到标题栏
        const titleActionContainer = leftTitleContainer.createDiv('file-ignore-title-actions');
        new ButtonComponent(titleActionContainer)
            .setButtonText(this.t.ignoreRules.searchButton)
            .setCta()
            .setTooltip(this.t.ignoreRules.searchTooltip || '')
            .onClick(async () => {
                await this.plugin.saveSettings(this.rulesTextArea.getValue());
                this.appliedRulesHistoryIndex = (this.plugin.settings.rulesHistory || []).indexOf(this.rulesTextArea.getValue());
                if (this.appliedRulesHistoryIndex === -1 && (this.plugin.settings.rulesHistory || []).length > 0) this.appliedRulesHistoryIndex = 0;
                this.updateNavigationButtonStates();
                await this.updateMatchedFilesImmediate();
                new Notice(this.t.notice?.rulesAppliedAndScanned || 'Rules scanned and preview updated!');
            });

        const textAreaContainer = leftPanel.createDiv('file-ignore-rules-textarea-container');

        // 导航按钮容器
        const navContainer = textAreaContainer.createDiv('file-ignore-nav-container');

        this.prevAppliedRuleButton = new ButtonComponent(navContainer)
            .setIcon('arrow-left')
            .setTooltip(this.t.ignoreRules.previousAppliedRuleTooltip || 'Previous applied rule')
            .setClass('file-ignore-nav-button')
            .onClick(() => { this.loadPreviousAppliedRule(); });

        this.nextAppliedRuleButton = new ButtonComponent(navContainer)
            .setIcon('arrow-right')
            .setTooltip(this.t.ignoreRules.nextAppliedRuleTooltip || 'Next applied rule')
            .setClass('file-ignore-nav-button')
            .onClick(() => { this.loadNextAppliedRule(); });

        new ButtonComponent(navContainer)
            .setButtonText(this.t.ignoreRules.resetButton)
            .setTooltip(this.t.ignoreRules.resetTooltip)
            .setClass('file-ignore-nav-button')
            .onClick(() => {
                const defaultValue = DEFAULT_SETTINGS.rules;
                this.rulesTextArea.setValue(defaultValue);
                this.plugin.settings.rules = defaultValue;
                this.appliedRulesHistoryIndex = (this.plugin.settings.rulesHistory || []).indexOf(defaultValue);
                this.updateNavigationButtonStates();
                this.debouncedUpdateDisplay();
            });

        this.rulesTextArea = new TextAreaComponent(textAreaContainer);
        this.rulesTextArea.inputEl.addClass('file-ignore-rules-textarea');
        this.rulesTextArea.inputEl.setAttribute('rows', '20');
        this.rulesTextArea.inputEl.setAttribute('placeholder', this.t.ignoreRules.rulesPlaceholder);
        // Populate with the current rules, which might have been updated by saveSettings
        this.rulesTextArea.setValue(this.plugin.settings.rules || DEFAULT_SETTINGS.rules);

        // After the saveSettings call, plugin.settings.rules should be at index 0 of rulesHistory if non-empty.
        this.appliedRulesHistoryIndex = (this.plugin.settings.rulesHistory || []).indexOf(this.plugin.settings.rules);

        this.updateNavigationButtonStates();

        this.rulesTextArea.onChange(async (value) => {
            this.plugin.settings.rules = value; // Update in-memory rules for debouncedUpdateDisplay IF it were here
            // But primarily, this is for saveSettings to pick up.
            this.saveSettings(value);
            // NO display update here, only on button clicks
        });

        const rightPanel = mainContainer.createDiv('file-ignore-matched-panel');
        const matchedFilesContainer = rightPanel.createDiv('file-ignore-matched-files-outer-container');
        const titleContainer = matchedFilesContainer.createDiv('file-ignore-matched-files-title-container');
        titleContainer.createEl('p', { text: this.t.ignoreRules.matchedFiles, cls: 'setting-item-name file-ignore-matched-files-title' });
        const filesListContainer = matchedFilesContainer.createDiv('file-ignore-matched-files-list-container');
        this.showLoading(filesListContainer);

        // 页面加载或重置时，执行一次更新以渲染匹配列表和持续显示提示
        this.updateDisplayAsync();

        // --- Add Buy Me A Coffee Link ---
        if (this.t.support) {
            const support = this.t.support;
            const supportSetting = new Setting(containerEl)
                .setName(support.name)
                .setDesc(support.desc)
                .addButton(button => button
                    .setButtonText(support.button)
                    .onClick(() => {
                        window.open('https://buymeacoffee.com/RDzWpfRwLU', '_blank');
                    }));
            supportSetting.controlEl.addClass('file-ignore-support-button-container');
        }
        // --- End Buy Me A Coffee Link ---

        new Setting(containerEl)
            .setName(this.t.debugToggle?.name ?? 'Debug logging')
            .setDesc(this.t.debugToggle?.desc ?? 'Write detailed diagnostics to the developer console.')
            .addToggle(toggle => {
                toggle.setValue(this.plugin.settings.debug ?? false);
                toggle.onChange(async value => {
                    this.plugin.settings.debug = value;
                    this.plugin.fileOps?.setDebug(value);
                    await this.plugin.saveSettings(undefined);
                    console.info('[file-ignore][audit]', value ? 'debug-enabled' : 'debug-disabled');
                });
            });
    }

    private showLoading(container: HTMLElement) {
        container.empty();
        container.createEl('div', { text: this.t.notice.loading, cls: 'setting-item-description file-ignore-loading' });
    }

    private renderMatchedFilesList(container: HTMLElement, matchedFiles: FileInfo[] | null, hiddenCount: number | null, error: Error | null) {
        container.empty();
        if (error) {
            container.createEl('p', { text: `Error loading list: ${error.message}`, cls: 'setting-item-description file-ignore-no-matches mod-error' });
            return;
        }
        if (matchedFiles === null || hiddenCount === null) {
            container.createEl('div', { text: this.t.notice.loading, cls: 'setting-item-description file-ignore-loading' });
            return;
        }

        const listEl = container.createDiv('file-ignore-matched-files');
        if (matchedFiles.length === 0) {
            listEl.createEl('p', { text: this.t.ignoreRules.noMatches, cls: 'setting-item-description file-ignore-no-matches' });
            return;
        }

        const summaryContainer = listEl.createDiv('file-ignore-matched-files-summary');
        if (this.t.matchedListSummary) {
            summaryContainer.createEl('p', { text: this.t.matchedListSummary.itemsMatched(matchedFiles.length), cls: 'file-ignore-summary-item' });
            summaryContainer.createEl('p', { text: this.t.matchedListSummary.itemsHidden(hiddenCount as number), cls: 'file-ignore-summary-item' });
        }

        const sortedFiles = [...matchedFiles].sort((a, b) => {
            if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
            return a.path.localeCompare(b.path);
        });

        const MAX_FILES_TO_DISPLAY = 30; // 定义最大显示文件数
        let filesToRender = sortedFiles;

        if (sortedFiles.length > MAX_FILES_TO_DISPLAY) {
            filesToRender = sortedFiles.slice(0, MAX_FILES_TO_DISPLAY);

            let truncationMessageText: string;
            // 尝试使用 i18n 获取翻译文本
            // @ts-ignore - 假设 t.matchedListSummary.displayingNofM 可能存在
            if (this.t.matchedListSummary && typeof this.t.matchedListSummary.displayingNofM === 'function') {
                // @ts-ignore
                truncationMessageText = this.t.matchedListSummary.displayingNofM(filesToRender.length, sortedFiles.length);
            } else {
                // Fallback 中文提示
                truncationMessageText = `列表过长，仅显示最前的 ${filesToRender.length} 项 (共 ${sortedFiles.length} 项)。隐藏/取消隐藏操作将对所有匹配项生效。`;
            }
            summaryContainer.createEl('p', {
                text: truncationMessageText,
                cls: 'file-ignore-summary-item file-ignore-truncation-message'
            });
        }

        const filesContainer = listEl.createDiv('file-ignore-matched-files-simplified');
        filesToRender.forEach(file => {
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

    private async confirmAction(hide: boolean, actionable: FileInfo[], skippedCount: number): Promise<boolean> {
        const title = hide ? (this.t.confirm?.titleHide || 'Confirm Hide') : (this.t.confirm?.titleShow || 'Confirm Show');
        const summaryFn = hide ? this.t.confirm?.summaryHide : this.t.confirm?.summaryShow;
        const summary = (summaryFn || ((c: number) => hide ? `Add a dot prefix to ${c} item(s).` : `Remove the dot prefix from ${c} item(s).`))(actionable.length);
        const protectedWarning = skippedCount > 0 ? (this.t.confirm?.protectedWarning || ((c: number) => `${c} protected item(s) will be skipped`))(skippedCount) : '';

        return await new Promise<boolean>((resolve) => {
            const modal = new class extends Modal {
                constructor(app: App) { super(app); }
                onOpen() {
                    const { contentEl } = this;
                    contentEl.empty();
                    contentEl.createEl('h3', { text: title });
                    contentEl.createEl('p', { text: summary });
                    if (protectedWarning) contentEl.createEl('p', { text: protectedWarning, cls: 'mod-warning' });
                    const btns = contentEl.createDiv({ cls: 'modal-button-container' });
                    new ButtonComponent(btns).setButtonText((this as any).t?.confirm?.proceed || 'Proceed')
                        .setCta().onClick(() => { this.close(); resolve(true); });
                    new ButtonComponent(btns).setButtonText((this as any).t?.confirm?.cancel || 'Cancel')
                        .onClick(() => { this.close(); resolve(false); });
                }
            }(this.app);
            (modal as any).t = this.t; // pass translation
            modal.open();
        });
    }

    private renderStatusInfo(container: HTMLElement, hiddenCount: number | null, error: Error | null) {
        container.empty();
        const statusEl = container.createDiv('file-ignore-status-info');
        const iconContainer = statusEl.createSpan('file-ignore-status-icon');
        const textContainer = statusEl.createSpan('file-ignore-status-text');

        if (error) {
            iconContainer.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
            textContainer.setText(`Error: ${error.message}`);
            statusEl.addClass('mod-error');
        } else {
            // Display fixed informational text, icon remains the info icon.
            iconContainer.innerHTML = '<svg viewBox="0 0 24 24" fill="none" width="16" height="16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
            textContainer.setText(this.t.settingsHeaderInfo || 'Click Hide/Show buttons to apply rules.');
        }
    }
}
