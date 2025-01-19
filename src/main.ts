import { App, Plugin, PluginSettingTab, Setting, Notice, TFile } from 'obsidian';
import { FileOperations } from './fileOperations';
import { ObsidianIgnoreSettings, DEFAULT_SETTINGS, ObsidianIgnoreSettingTab } from './settings';

export default class ObsidianIgnore extends Plugin {
    settings: ObsidianIgnoreSettings;
    fileOps: FileOperations;

    async onload() {
        console.log('[ObsidianIgnore] 插件开始加载...');
        try {
            await this.loadSettings();
            console.log('[ObsidianIgnore] 设置加载完成:', this.settings);

            // 初始化 FileOperations
            this.fileOps = new FileOperations(this.app.vault);
            this.fileOps.setDebug(this.settings.debug);
            console.log('[ObsidianIgnore] FileOperations 初始化完成');

            // 添加设置标签页
            this.addSettingTab(new ObsidianIgnoreSettingTab(this.app, this));

            // 监听文件变更
            this.registerEvent(
                this.app.vault.on('rename', () => {
                    // 使用 requestSaveLayout 来刷新文件列表
                    this.app.workspace.requestSaveLayout();
                })
            );

            // 添加命令
            this.addCommand({
                id: 'apply-ignore-rules',
                name: '应用忽略规则',
                callback: async () => {
                    await this.applyRules();
                },
            });

            this.addCommand({
                id: 'add-dot-prefix',
                name: '添加点前缀（隐藏文件）',
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
                name: '移除点前缀（显示文件）',
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
                    if (file instanceof TFile) {
                        menu.addItem((item) => {
                            item
                                .setTitle(file.path.startsWith('.') ? '取消隐藏' : '隐藏文件')
                                .setIcon(file.path.startsWith('.') ? 'eye' : 'eye-off')
                                .onClick(async () => {
                                    if (file.path.startsWith('.')) {
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
            console.error('[ObsidianIgnore] 插件加载出错:', error);
        }
    }

    onunload() {
        // 清理工作
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
        this.app.workspace.trigger('obsidianignore:settings-update');
    }

    // 文件操作方法
    async addDotPrefix(file: TFile) {
        try {
            await this.fileOps.addDotPrefix(file);
            new Notice('文件已隐藏');
            this.app.workspace.requestSaveLayout();
        } catch (error) {
            console.error('隐藏文件失败:', error);
            new Notice('隐藏文件失败');
        }
    }

    async removeDotPrefix(file: TFile) {
        try {
            await this.fileOps.removeDotPrefix(file);
            new Notice('文件已显示');
            this.app.workspace.requestSaveLayout();
        } catch (error) {
            console.error('显示文件失败:', error);
            new Notice('显示文件失败');
        }
    }

    async applyRules(isAdd: boolean = true) {
        console.log('[ObsidianIgnore] 开始应用规则...');
        try {
            if (!this.fileOps) {
                throw new Error('FileOperations 未初始化');
            }

            const rules = this.settings.rules
                .split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('#'));

            console.log('[ObsidianIgnore] 处理的规则:', rules);

            if (!rules.length) {
                console.log('[ObsidianIgnore] 没有有效的规则');
                new Notice('没有有效的规则');
                return;
            }

            const files = await this.fileOps.getFilesToProcess(rules);
            console.log('[ObsidianIgnore] 匹配到的文件:', files);

            if (files.length === 0) {
                console.log('[ObsidianIgnore] 没有找到匹配的文件');
                new Notice('没有找到匹配的文件');
                return;
            }

            for (const file of files) {
                console.log('[ObsidianIgnore] 正在处理文件:', file.path);
                await this.fileOps.addDotPrefix(file, isAdd);
            }

            new Notice(`成功${isAdd ? '隐藏' : '显示'} ${files.length} 个文件`);
            this.app.workspace.trigger('file-menu');
        } catch (error) {
            console.error('[ObsidianIgnore] 应用规则时出错:', error);
            new Notice('应用规则时出错: ' + error.message);
            throw error;
        }
    }

    async rollback() {
        try {
            await this.fileOps.rollback();
            // 请求 Obsidian 刷新文件列表
            this.app.workspace.trigger('file-menu');
        } catch (error) {
            console.error('回滚操作失败:', error);
            throw error;
        }
    }
} 