import { App, Notice, Plugin, TFile, TFolder } from 'obsidian';
import { FileOperations, type RenamePlan } from './fileOperations';
import { FileIgnoreSettingTab } from './settings';
import { LocalFileSystem, FileInfo } from './localFileSystem';
import { locales, type Translation } from './i18n/locales';
import moment from 'moment';
import {
    DEFAULT_SETTINGS,
    type BatchAction,
    type FileIgnoreSettings,
    type FileOperation,
    type PersistedBatchRecord,
} from './types';

interface FileSystemAdapterExtended {
    getBasePath(): string;
}

export default class FileIgnorePlugin extends Plugin {
    settings: FileIgnoreSettings;
    fileOps: FileOperations | undefined;
    localFs: LocalFileSystem | undefined;
    t: Translation;

    private initTranslations() {
        const obsidianLang = moment.locale();
        let langKey: keyof typeof locales = 'en';

        if (obsidianLang.startsWith('zh')) {
            langKey = (obsidianLang === 'zh-tw' || obsidianLang === 'zh-hk') ? 'zh-TW' : 'zh-CN';
        } else if (locales.hasOwnProperty(obsidianLang)) {
            langKey = obsidianLang as keyof typeof locales;
        }
        this.t = locales[langKey];

        if (this.settings.debug) {
            console.debug(`[file-ignore] Obsidian language: ${obsidianLang}, Using translation: ${langKey}`);
        }
    }

    async onload() {
        try {
            await this.loadSettings();

            if (this.settings.debug) {
                console.debug('[file-ignore] Plugin loading started');
            }

            this.initTranslations();

            const adapter = this.app.vault.adapter as unknown as FileSystemAdapterExtended;
            const basePath = adapter.getBasePath();

            this.fileOps = new FileOperations(this.app.vault);
            this.fileOps.setDebug(this.settings.debug || false);
            this.localFs = new LocalFileSystem(basePath);

            this.addSettingTab(new FileIgnoreSettingTab(this.app, this));
            this.maybeNotifyRecoveryState();
        } catch (error) {
            console.error('[file-ignore] Plugin loading error:', error);
        }
    }

    onunload() {
        if (this.settings?.debug) {
            console.debug('[file-ignore] Plugin unloading...');
        }
        this.fileOps = undefined;
        this.localFs = undefined;
        if (this.settings?.debug) {
            console.debug('[file-ignore] Plugin unloaded');
        }
    }

    private maybeNotifyRecoveryState() {
        const batch = this.settings.lastBatch;
        if (!batch) {
            return;
        }

        if ((batch.status === 'running' || batch.status === 'failed') && batch.completed.length > 0) {
            new Notice(
                this.t.notice.recoveryAvailable?.(batch.completed.length)
                ?? `Recovery available for ${batch.completed.length} item(s). Open File Ignore settings to undo the interrupted batch.`
            );
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        this.settings.rulesHistory = Array.isArray(this.settings.rulesHistory) ? this.settings.rulesHistory : [];
        this.settings.ignoredFiles = Array.isArray(this.settings.ignoredFiles) ? this.settings.ignoredFiles : [];
        this.settings.lastBatch = this.settings.lastBatch ?? null;
        if (!this.settings.rules || !this.settings.rules.trim()) {
            this.settings.rules = DEFAULT_SETTINGS.rules;
        }
    }

    private async persistState(triggerWorkspaceUpdate: boolean = false) {
        await this.saveData(this.settings);
        if (this.fileOps) {
            this.fileOps.setDebug(this.settings.debug || false);
        }
        if (triggerWorkspaceUpdate) {
            this.app.workspace.trigger('file-ignore:settings-update');
        }
    }

    async saveSettings(rulesToSave?: string, addToHistory: boolean = false) {
        if (rulesToSave !== undefined) {
            this.settings.rules = rulesToSave;
        }

        if (addToHistory && this.settings.rules && this.settings.rules.trim() !== '') {
            this.settings.rulesHistory = this.settings.rulesHistory.filter(r => r !== this.settings.rules);
            this.settings.rulesHistory.unshift(this.settings.rules);
            if (this.settings.rulesHistory.length > 5) {
                this.settings.rulesHistory = this.settings.rulesHistory.slice(0, 5);
            }
        }

        await this.persistState(true);
    }

    public getRecoverableBatch(): PersistedBatchRecord | null {
        const batch = this.settings.lastBatch;
        if (!batch || batch.completed.length === 0 || batch.status === 'rolled-back') {
            return null;
        }
        return batch;
    }

    public getRecoveryMode(batch: PersistedBatchRecord | null = this.getRecoverableBatch()): 'recover' | 'undo' {
        if (!batch) {
            return 'undo';
        }
        return batch.status === 'running' || batch.status === 'failed' ? 'recover' : 'undo';
    }

    private buildBatchRecord(action: BatchAction, rulesText: string, plan: RenamePlan): PersistedBatchRecord {
        const now = Date.now();
        const pending: FileOperation[] = plan.items.map(item => ({
            oldPath: item.oldPath,
            newPath: item.newPath,
            timestamp: 0,
        }));

        return {
            id: `${now.toString(36)}-${action}`,
            action,
            createdAt: now,
            updatedAt: now,
            rulesText,
            plannedCount: plan.items.length,
            skippedProtected: plan.skippedProtected,
            skippedNested: plan.skippedNested,
            skippedConflicts: plan.skippedConflicts,
            completed: [],
            pending,
            status: 'running',
        };
    }

    private async recordBatchProgress(batch: PersistedBatchRecord, operation: FileOperation) {
        batch.completed.push(operation);
        batch.pending = batch.pending.filter(item => !(item.oldPath === operation.oldPath && item.newPath === operation.newPath));
        batch.updatedAt = Date.now();
        this.settings.lastBatch = batch;
        await this.persistState(false);
    }

    private notifyPlanWarnings(plan: RenamePlan) {
        if (plan.skippedProtected > 0 && this.t.notice.protectedSkipped) {
            new Notice(this.t.notice.protectedSkipped(plan.skippedProtected));
        }
        if (plan.skippedNested > 0) {
            new Notice(
                this.t.notice.nestedSkipped?.(plan.skippedNested)
                ?? `${plan.skippedNested} nested item(s) skipped because their parent directory is already planned.`
            );
        }
        if (plan.skippedConflicts > 0) {
            new Notice(
                this.t.notice.conflictsSkipped?.(plan.skippedConflicts)
                ?? `${plan.skippedConflicts} item(s) skipped because the target path already exists or conflicts with another rename.`
            );
        }
    }

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
            console.error('[file-ignore] Hide operation failed:', error);
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
            console.error('[file-ignore] Show operation failed:', error);
            new Notice(this.t.notice.showError);
        }
    }

    async applyRules(hide: boolean, precomputed?: { matches?: FileInfo[]; plan?: RenamePlan }) {
        if (!this.fileOps) {
            new Notice(this.t.notice.settingsErrorInit);
            return;
        }
        try {
            const currentRulesText = this.settings.rules;
            const currentRulesArray = currentRulesText.split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('#'));

            if (currentRulesArray.length === 0) {
                new Notice(this.t.notice.noRules);
                return;
            }

            const filesToProcess: FileInfo[] = precomputed?.matches ?? await this.fileOps.getFilesToProcess(currentRulesArray);
            if (filesToProcess.length === 0) {
                new Notice(this.t.notice.noMatches);
                return;
            }

            const plan = precomputed?.plan ?? this.fileOps.buildRenamePlan(filesToProcess, hide);
            this.notifyPlanWarnings(plan);

            if (plan.items.length === 0) {
                new Notice(this.t.notice.noActionNeeded);
                console.info('[file-ignore][audit]', 'batch-summary', {
                    action: hide ? 'hide' : 'show',
                    totalMatched: filesToProcess.length,
                    planned: 0,
                    changed: 0,
                    failed: 0,
                    skippedProtected: plan.skippedProtected,
                    skippedNested: plan.skippedNested,
                    skippedConflicts: plan.skippedConflicts,
                    noopCount: plan.noopCount,
                });
                return;
            }

            const action: BatchAction = hide ? 'hide' : 'show';
            const batch = this.buildBatchRecord(action, currentRulesText, plan);
            this.settings.lastBatch = batch;
            await this.persistState(false);

            let changedCount = 0;
            let failedCount = 0;
            let processedCount = 0;

            for (const item of plan.items) {
                const result = await this.fileOps.executePlanItem(item, action);
                if (result.success) {
                    changedCount++;
                    await this.recordBatchProgress(batch, {
                        oldPath: item.oldPath,
                        newPath: item.newPath,
                        timestamp: Date.now(),
                    });
                } else {
                    failedCount++;
                    batch.status = 'failed';
                    batch.lastError = result.error || this.t.notice.unknownError || 'Unknown error during file operation';
                    this.settings.lastBatch = batch;
                    await this.persistState(false);
                    new Notice(`${this.t.notice[hide ? 'hideError' : 'showError']} ${item.oldPath}: ${batch.lastError}`);
                }

                processedCount++;
                if (processedCount % 25 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }

            batch.updatedAt = Date.now();
            batch.status = failedCount > 0 ? 'failed' : 'completed';
            this.settings.lastBatch = batch;

            if (changedCount > 0) {
                new Notice(hide ? this.t.notice.applied(changedCount) : this.t.notice.reverted(changedCount));
                await this.saveSettings(currentRulesText, true);
            } else {
                await this.persistState(true);
            }

            if (failedCount > 0) {
                new Notice(
                    this.t.notice.partialFailure?.(failedCount)
                    ?? `${failedCount} item(s) failed. Check the developer console for details.`
                );
            }

            console.info('[file-ignore][audit]', 'batch-summary', {
                action,
                totalMatched: filesToProcess.length,
                planned: plan.items.length,
                changed: changedCount,
                failed: failedCount,
                skippedProtected: plan.skippedProtected,
                skippedNested: plan.skippedNested,
                skippedConflicts: plan.skippedConflicts,
                noopCount: plan.noopCount,
                batchId: batch.id,
                status: batch.status,
            });
        } catch (error: any) {
            console.error('[file-ignore] Error in applyRules:', error);
            new Notice(this.t.notice.applyError(error.message));
        }
    }

    async rollback() {
        try {
            const batch = this.getRecoverableBatch();
            if (batch && this.fileOps) {
                await this.fileOps.rollbackBatch(batch.completed);
                batch.status = 'rolled-back';
                batch.pending = [];
                batch.updatedAt = Date.now();
                this.settings.lastBatch = batch;
                await this.persistState(true);
                new Notice(this.t.notice.rollbackSuccess);
                this.app.workspace.requestSaveLayout();
                return;
            }

            await this.fileOps?.rollback();
            new Notice(this.t.notice.rollbackSuccess);
            this.app.workspace.requestSaveLayout();
        } catch (error: any) {
            console.error('[file-ignore] Rollback operation failed:', error);
            new Notice(this.t.notice.rollbackError(error.message || this.t.notice.unknownError));
        }
    }
}
