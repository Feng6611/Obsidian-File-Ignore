export interface Translation {
    // 设置页面标题
    settingsTitle: string;
    // 应用规则按钮
    applyRules: {
        name: string;
        desc: string;
        button: string;
        success: string;
        error: string;
    };
    // 撤销规则按钮
    revertRules: {
        name: string;
        desc: string;
        button: string;
        success: string;
        error: string;
    };
    // 忽略规则设置
    ignoreRules: {
        title: string;
        formatTitle: string;
        formats: string[];
        noMatches: string;
        matchedFiles: string;
    };
}

export const en: Translation = {
    settingsTitle: 'ObsidianIgnore Settings',
    applyRules: {
        name: 'Apply Rules',
        desc: 'Add dot prefix to matched files to hide them in Obsidian',
        button: 'Apply Rules',
        success: 'Rules applied',
        error: 'Error applying rules: ',
    },
    revertRules: {
        name: 'Revert Rules',
        desc: 'Remove dot prefix from matched files to show them in Obsidian',
        button: 'Revert Rules',
        success: 'Rules reverted',
        error: 'Error reverting rules: ',
    },
    ignoreRules: {
        title: 'Ignore Rules',
        formatTitle: 'Supported rule formats (one per line):',
        formats: [
            'All files: test.md',
            'Absolute path: /readme.md (root directory only)',
            'Directory: temp/',
            'Wildcard directory: *test/'
        ],
        noMatches: 'No matches found',
        matchedFiles: 'Currently Matched Files',
    },
};

export const zhCN: Translation = {
    settingsTitle: 'ObsidianIgnore 设置',
    applyRules: {
        name: '应用规则',
        desc: '为匹配的文件添加点前缀，使其在 Obsidian 中隐藏',
        button: '应用规则',
        success: '规则已应用',
        error: '应用规则时出错：',
    },
    revertRules: {
        name: '撤销规则',
        desc: '为匹配的文件移除点前缀，使其在 Obsidian 中显示',
        button: '撤销规则',
        success: '规则已撤销',
        error: '撤销规则时出错：',
    },
    ignoreRules: {
        title: '忽略规则',
        formatTitle: '支持的规则格式（每行一条）：',
        formats: [
            '全部文件：test.md',
            '绝对路径：/readme.md（只匹配根目录）',
            '文件夹：temp/',
            '通配符目录：*test/'
        ],
        noMatches: '没有匹配的项目',
        matchedFiles: '当前匹配的文件',
    },
};

export const zhTW: Translation = {
    settingsTitle: 'ObsidianIgnore 設定',
    applyRules: {
        name: '套用規則',
        desc: '為符合的檔案添加點字首，使其在 Obsidian 中隱藏',
        button: '套用規則',
        success: '規則已套用',
        error: '套用規則時發生錯誤：',
    },
    revertRules: {
        name: '還原規則',
        desc: '為符合的檔案移除點字首，使其在 Obsidian 中顯示',
        button: '還原規則',
        success: '規則已還原',
        error: '還原規則時發生錯誤：',
    },
    ignoreRules: {
        title: '忽略規則',
        formatTitle: '支援的規則格式（每行一條）：',
        formats: [
            '全部檔案：test.md',
            '絕對路徑：/readme.md（僅匹配根目錄）',
            '資料夾：temp/',
            '萬用字元目錄：*test/'
        ],
        noMatches: '沒有符合的項目',
        matchedFiles: '目前符合的檔案',
    },
};

export const ja: Translation = {
    settingsTitle: 'ObsidianIgnore 設定',
    applyRules: {
        name: 'ルールを適用',
        desc: 'マッチしたファイルにドットプレフィックスを追加してObsidianで非表示にする',
        button: 'ルールを適用',
        success: 'ルールが適用されました',
        error: 'ルールの適用中にエラーが発生しました：',
    },
    revertRules: {
        name: 'ルールを元に戻す',
        desc: 'マッチしたファイルからドットプレフィックスを削除してObsidianで表示する',
        button: 'ルールを元に戻す',
        success: 'ルールが元に戻されました',
        error: 'ルールの復元中にエラーが発生しました：',
    },
    ignoreRules: {
        title: '無視ルール',
        formatTitle: 'サポートされているルール形式（1行につき1つ）：',
        formats: [
            'すべてのファイル：test.md',
            '絶対パス：/readme.md（ルートディレクトリのみ）',
            'フォルダ：temp/',
            'ワイルドカードディレクトリ：*test/'
        ],
        noMatches: '一致するものがありません',
        matchedFiles: '現在マッチしているファイル',
    },
};

export const locales = {
    en,
    'zh-CN': zhCN,
    'zh-TW': zhTW,
    ja,
};

export type LocaleKey = keyof typeof locales; 