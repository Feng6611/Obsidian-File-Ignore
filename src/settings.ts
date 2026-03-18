import { App, ButtonComponent, Modal, Notice, PluginSettingTab, Setting, TextAreaComponent, debounce } from 'obsidian';
import type FileIgnorePlugin from './main';
import type { RenamePlan } from './fileOperations';
import type { Translation } from './i18n/locales';
import type { FileInfo } from './localFileSystem';
import { DEFAULT_SETTINGS } from './types';

export class FileIgnoreSettingTab extends PluginSettingTab {
    plugin: FileIgnorePlugin;
    rulesTextArea: TextAreaComponent;
    t: Translation;
    private debouncedUpdateMatchedFiles: () => void;

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

    saveSettings = debounce(async (value: string) => {
        await this.plugin.saveSettings(value);
        const currentRulesInHistory = this.plugin.settings.rulesHistory || [];
        this.appliedRulesHistoryIndex = currentRulesInHistory.indexOf(value);
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
            hiddenCount = matchedFiles.filter(file => this.plugin.fileOps!.isHiddenPath(file.path)).length;
        } catch (e) {
            console.error('[file-ignore] Error updating display:', e);
            error = e instanceof Error ? e : new Error(String(e));
        }

        this.renderStatusInfo(statusContainer, hiddenCount, error);
        this.renderMatchedFilesList(listContainer, matchedFiles, hiddenCount, error);
    }

    private async updateMatchedFilesImmediate() {
        await this.updateDisplayAsync();
    }

    private loadRuleAndRefresh(ruleText: string, newIndex: number) {
        this.rulesTextArea.setValue(ruleText);
        this.plugin.settings.rules = ruleText;
        this.appliedRulesHistoryIndex = newIndex;
        this.updateNavigationButtonStates();
        this.debouncedUpdateDisplay();
        new Notice(this.t.notice.ruleLoadedFromHistory || 'Rule loaded from history.');
    }

    private loadPreviousAppliedRule() {
        const history = this.plugin.settings.rulesHistory || [];
        if (history.length === 0) return;

        let newIndex;
        if (this.appliedRulesHistoryIndex === -1) {
            newIndex = history.length - 1;
        } else if (this.appliedRulesHistoryIndex > 0) {
            newIndex = this.appliedRulesHistoryIndex - 1;
        } else {
            return;
        }
        if (newIndex >= 0 && newIndex < history.length) {
            this.loadRuleAndRefresh(history[newIndex], newIndex);
        }
    }

    private loadNextAppliedRule() {
        const history = this.plugin.settings.rulesHistory || [];
        if (history.length === 0) return;

        let newIndex;
        if (this.appliedRulesHistoryIndex === -1) {
            newIndex = 0;
        } else if (this.appliedRulesHistoryIndex < history.length - 1) {
            newIndex = this.appliedRulesHistoryIndex + 1;
        } else {
            return;
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
                this.prevAppliedRuleButton.setDisabled(false);
            } else {
                this.prevAppliedRuleButton.setDisabled(this.appliedRulesHistoryIndex === 0);
            }
        }
        if (this.nextAppliedRuleButton) {
            if (historyLength === 0) {
                this.nextAppliedRuleButton.setDisabled(true);
            } else if (this.appliedRulesHistoryIndex === -1) {
                this.nextAppliedRuleButton.setDisabled(false);
            } else {
                this.nextAppliedRuleButton.setDisabled(this.appliedRulesHistoryIndex === historyLength - 1);
            }
        }
    }

    private async preparePlan(hide: boolean): Promise<{ matched: FileInfo[]; plan: RenamePlan } | null> {
        await this.plugin.saveSettings(this.rulesTextArea.getValue());
        const currentRules = this.plugin.settings.rules.split('\n')
            .map((line: string) => line.trim())
            .filter((line: string) => line && !line.startsWith('#'));

        if (currentRules.length === 0) {
            new Notice(this.t.notice.noRules);
            return null;
        }

        if (!this.plugin.fileOps) {
            new Notice(this.t.notice.settingsErrorInit);
            return null;
        }

        const recoverableBatch = this.plugin.getRecoverableBatch();
        const rawMatched = await this.plugin.fileOps.getFilesToProcess(currentRules);
        const matched = hide
            ? rawMatched
            : this.plugin.fileOps.filterRestorableFiles(rawMatched, recoverableBatch);
        if (matched.length === 0) {
            new Notice(this.t.notice.noMatches);
            return null;
        }

        const plan = this.plugin.fileOps.buildRenamePlan(matched, hide, recoverableBatch);
        return { matched, plan };
    }

    private renderRecoverySection(containerEl: HTMLElement) {
        const batch = this.plugin.getRecoverableBatch();
        if (!batch) {
            return;
        }

        const mode = this.plugin.getRecoveryMode(batch);
        const renameCount = batch.completed.length;
        const pendingCount = batch.pending.length;

        const desc = mode === 'recover'
            ? (this.t.recovery?.interruptedDesc?.(renameCount, pendingCount)
                ?? `${renameCount} item(s) were already renamed before the last batch stopped. ${pendingCount} item(s) remain pending.`)
            : (this.t.recovery?.completedDesc?.(renameCount)
                ?? `Undo the last completed batch (${renameCount} renamed item(s)).`);

        new Setting(containerEl)
            .setName(this.t.recovery?.title ?? 'Recovery')
            .setDesc(desc)
            .addButton(button => button
                .setButtonText(mode === 'recover'
                    ? (this.t.recovery?.buttonRecover ?? 'Undo interrupted batch')
                    : (this.t.recovery?.buttonUndo ?? 'Undo last batch'))
                .setCta()
                .onClick(async () => {
                    await this.plugin.rollback();
                    await this.display();
                    await this.updateDisplayAsync();
                }));
    }

    async display(): Promise<void> {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: this.t.settingsTitle, cls: 'file-ignore-settings-title' });

        const initialPluginRules = this.plugin.settings.rules;
        await this.plugin.saveSettings(initialPluginRules, true);

        const topActionRow = containerEl.createDiv('file-ignore-top-action-row');
        const statusContainer = topActionRow.createDiv('file-ignore-status-inline-container');
        this.renderStatusInfo(statusContainer, null, null);

        const buttonGroup = topActionRow.createDiv('file-ignore-button-group');
        new ButtonComponent(buttonGroup)
            .setButtonText(this.t.applyRules.button)
            .setCta()
            .setTooltip(this.t.applyRules.desc)
            .onClick(async () => {
                const prepared = await this.preparePlan(true);
                if (!prepared) return;
                const { matched, plan } = prepared;
                if (plan.items.length === 0) {
                    new Notice(this.t.notice.noActionNeeded);
                    return;
                }
                const ok = await this.confirmAction(true, plan);
                if (!ok) {
                    await this.updateDisplayAsync();
                    return;
                }
                await this.plugin.applyRules(true, { matches: matched, plan });
                await this.display();
                await this.updateDisplayAsync();
            });

        new ButtonComponent(buttonGroup)
            .setButtonText(this.t.revertRules.button)
            .setTooltip(this.t.revertRules.desc)
            .onClick(async () => {
                const prepared = await this.preparePlan(false);
                if (!prepared) return;
                const { matched, plan } = prepared;
                if (plan.items.length === 0) {
                    new Notice(this.t.notice.noActionNeeded);
                    return;
                }
                const ok = await this.confirmAction(false, plan);
                if (!ok) {
                    await this.updateDisplayAsync();
                    return;
                }
                await this.plugin.applyRules(false, { matches: matched, plan });
                await this.display();
                await this.updateDisplayAsync();
            });

        this.renderRecoverySection(containerEl);

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

        const titleActionContainer = leftTitleContainer.createDiv('file-ignore-title-actions');
        new ButtonComponent(titleActionContainer)
            .setButtonText(this.t.ignoreRules.searchButton)
            .setCta()
            .setTooltip(this.t.ignoreRules.searchTooltip || '')
            .onClick(async () => {
                await this.plugin.saveSettings(this.rulesTextArea.getValue());
                this.appliedRulesHistoryIndex = (this.plugin.settings.rulesHistory || []).indexOf(this.rulesTextArea.getValue());
                if (this.appliedRulesHistoryIndex === -1 && (this.plugin.settings.rulesHistory || []).length > 0) {
                    this.appliedRulesHistoryIndex = 0;
                }
                this.updateNavigationButtonStates();
                await this.updateMatchedFilesImmediate();
                new Notice(this.t.notice?.rulesAppliedAndScanned || 'Rules scanned and preview updated!');
            });

        const textAreaContainer = leftPanel.createDiv('file-ignore-rules-textarea-container');
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
        this.rulesTextArea.setValue(this.plugin.settings.rules || DEFAULT_SETTINGS.rules);

        this.appliedRulesHistoryIndex = (this.plugin.settings.rulesHistory || []).indexOf(this.plugin.settings.rules);
        this.updateNavigationButtonStates();

        this.rulesTextArea.onChange(async (value) => {
            this.plugin.settings.rules = value;
            this.saveSettings(value);
        });

        const rightPanel = mainContainer.createDiv('file-ignore-matched-panel');
        const matchedFilesContainer = rightPanel.createDiv('file-ignore-matched-files-outer-container');
        const titleContainer = matchedFilesContainer.createDiv('file-ignore-matched-files-title-container');
        titleContainer.createEl('p', { text: this.t.ignoreRules.matchedFiles, cls: 'setting-item-name file-ignore-matched-files-title' });
        const filesListContainer = matchedFilesContainer.createDiv('file-ignore-matched-files-list-container');
        this.showLoading(filesListContainer);

        this.updateDisplayAsync();

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
            summaryContainer.createEl('p', { text: this.t.matchedListSummary.itemsHidden(hiddenCount), cls: 'file-ignore-summary-item' });
        }

        const sortedFiles = [...matchedFiles].sort((a, b) => {
            if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
            return a.path.localeCompare(b.path);
        });

        const MAX_FILES_TO_DISPLAY = 30;
        let filesToRender = sortedFiles;

        if (sortedFiles.length > MAX_FILES_TO_DISPLAY) {
            filesToRender = sortedFiles.slice(0, MAX_FILES_TO_DISPLAY);
            const truncationMessageText = this.t.matchedListSummary?.displayingNofM?.(filesToRender.length, sortedFiles.length)
                ?? `List is long, only showing the first ${filesToRender.length} items (of ${sortedFiles.length}). Hide/Show will still affect all matched items.`;
            summaryContainer.createEl('p', {
                text: truncationMessageText,
                cls: 'file-ignore-summary-item file-ignore-truncation-message'
            });
        }

        const filesContainer = listEl.createDiv('file-ignore-matched-files-simplified');
        filesToRender.forEach(file => {
            const isFolder = file.isDirectory;
            const fileItem = filesContainer.createDiv(`file-ignore-file-item ${isFolder ? 'file-ignore-folder-item' : 'file-ignore-regular-item'}`);
            const displayPath = isFolder ? `${file.path}/` : file.path;
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

    private async confirmAction(hide: boolean, plan: RenamePlan): Promise<boolean> {
        const title = hide ? (this.t.confirm?.titleHide || 'Confirm Hide') : (this.t.confirm?.titleShow || 'Confirm Show');
        const summaryFn = hide ? this.t.confirm?.summaryHide : this.t.confirm?.summaryShow;
        const summary = (summaryFn || ((count: number) => hide ? `Add a dot prefix to ${count} item(s).` : `Remove the dot prefix from ${count} item(s).`))(plan.items.length);
        const protectedWarning = plan.skippedProtected > 0
            ? (this.t.confirm?.protectedWarning || ((count: number) => `${count} protected item(s) will be skipped`))(plan.skippedProtected)
            : '';
        const nestedWarning = plan.skippedNested > 0
            ? (this.t.confirm?.nestedWarning?.(plan.skippedNested) ?? `${plan.skippedNested} nested item(s) will be skipped because their parent directory is already in the plan.`)
            : '';
        const conflictWarning = plan.skippedConflicts > 0
            ? (this.t.confirm?.conflictWarning?.(plan.skippedConflicts) ?? `${plan.skippedConflicts} item(s) will be skipped because the target path already exists or conflicts with another rename.`)
            : '';

        return await new Promise<boolean>((resolve) => {
            const modal = new class extends Modal {
                constructor(app: App) { super(app); }
                onOpen() {
                    const { contentEl } = this;
                    contentEl.empty();
                    contentEl.createEl('h3', { text: title });
                    contentEl.createEl('p', { text: summary });
                    if (protectedWarning) contentEl.createEl('p', { text: protectedWarning, cls: 'mod-warning' });
                    if (nestedWarning) contentEl.createEl('p', { text: nestedWarning, cls: 'mod-warning' });
                    if (conflictWarning) contentEl.createEl('p', { text: conflictWarning, cls: 'mod-warning' });

                    if (plan.items.length > 0) {
                        contentEl.createEl('h4', { text: (this as any).t?.confirm?.previewTitle || 'Planned renames' });
                        const previewList = contentEl.createEl('ul');
                        const previewItems = plan.items.slice(0, 5);
                        previewItems.forEach(item => {
                            previewList.createEl('li', { text: `${item.oldPath} → ${item.newPath}` });
                        });
                        if (plan.items.length > previewItems.length) {
                            contentEl.createEl('p', {
                                text: (this as any).t?.confirm?.previewMore?.(plan.items.length - previewItems.length)
                                    || `…and ${plan.items.length - previewItems.length} more.`
                            });
                        }
                    }

                    const btns = contentEl.createDiv({ cls: 'modal-button-container' });
                    new ButtonComponent(btns)
                        .setButtonText((this as any).t?.confirm?.proceed || 'Proceed')
                        .setCta()
                        .onClick(() => { this.close(); resolve(true); });
                    new ButtonComponent(btns)
                        .setButtonText((this as any).t?.confirm?.cancel || 'Cancel')
                        .onClick(() => { this.close(); resolve(false); });
                }
            }(this.app);
            (modal as any).t = this.t;
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
            iconContainer.innerHTML = '<svg viewBox="0 0 24 24" fill="none" width="16" height="16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
            textContainer.setText(this.t.settingsHeaderInfo || 'Click Hide/Show buttons to apply rules.');
        }
    }
}
