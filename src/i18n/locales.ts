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
    settingsTitle: 'File Ignore Settings',
    applyRules: {
        name: 'Hide files',
        desc: 'Add dot prefix to hide matched files',
        button: 'Hide files',
        success: 'Files hidden successfully',
        error: 'Failed to hide files: ',
    },
    revertRules: {
        name: 'Show files',
        desc: 'Remove dot prefix to show matched files',
        button: 'Show files',
        success: 'Files shown successfully',
        error: 'Failed to show files: ',
    },
    ignoreRules: {
        title: 'Ignore rules',
        formatTitle: 'Rule format (one per line):',
        formats: [
            'File pattern: test.md',
            'Root path: /readme.md',
            'Directory: temp/',
            'Wildcard: *test/'
        ],
        noMatches: 'No matching files',
        matchedFiles: 'Matched files',
    },
};

export const zhCN: Translation = {
    settingsTitle: 'File Ignore 设置',
    applyRules: {
        name: '隐藏文件',
        desc: '为匹配的文件添加点前缀以隐藏',
        button: '隐藏文件',
        success: '文件已隐藏',
        error: '隐藏文件失败：',
    },
    revertRules: {
        name: '显示文件',
        desc: '移除匹配文件的点前缀以显示',
        button: '显示文件',
        success: '文件已显示',
        error: '显示文件失败：',
    },
    ignoreRules: {
        title: '忽略规则',
        formatTitle: '规则格式（每行一条）：',
        formats: [
            '文件名：test.md',
            '根目录：/readme.md',
            '文件夹：temp/',
            '通配符：*test/'
        ],
        noMatches: '无匹配文件',
        matchedFiles: '匹配的文件',
    },
};

export const zhTW: Translation = {
    settingsTitle: 'File Ignore 設定',
    applyRules: {
        name: '隱藏檔案',
        desc: '為符合的檔案加入點字首以隱藏',
        button: '隱藏檔案',
        success: '檔案已隱藏',
        error: '隱藏檔案失敗：',
    },
    revertRules: {
        name: '顯示檔案',
        desc: '移除符合檔案的點字首以顯示',
        button: '顯示檔案',
        success: '檔案已顯示',
        error: '顯示檔案失敗：',
    },
    ignoreRules: {
        title: '忽略規則',
        formatTitle: '規則格式（每行一條）：',
        formats: [
            '檔案模式：test.md',
            '根目錄：/readme.md',
            '資料夾：temp/',
            '萬用字元：*test/'
        ],
        noMatches: '無符合檔案',
        matchedFiles: '符合的檔案',
    },
};

export const ja: Translation = {
    settingsTitle: 'File Ignore 設定',
    applyRules: {
        name: 'ファイルを隠す',
        desc: 'マッチしたファイルにドット接頭辞を追加して隠す',
        button: '隠す',
        success: 'ファイルを隠しました',
        error: 'ファイルを隠せませんでした：',
    },
    revertRules: {
        name: 'ファイルを表示',
        desc: 'マッチしたファイルのドット接頭辞を削除して表示',
        button: '表示',
        success: 'ファイルを表示しました',
        error: 'ファイルを表示できませんでした：',
    },
    ignoreRules: {
        title: '無視ルール',
        formatTitle: 'ルール形式（1行に1つ）：',
        formats: [
            'ファイル：test.md',
            'ルート：/readme.md',
            'フォルダ：temp/',
            'ワイルドカード：*test/'
        ],
        noMatches: '一致するファイルがありません',
        matchedFiles: '一致したファイル',
    },
};

export const locales: Record<string, Translation> = {
    'en': en,
    'zh-CN': zhCN,
    'zh-TW': zhTW,
    'ja': ja,
};

export type LocaleKey = keyof typeof locales; 