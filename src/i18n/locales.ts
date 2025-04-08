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
        resetButton: string; // 重置按钮文本
        allFilesButton: string; // 添加所有文件按钮文本
        rulesTitle: string; // 新增: Rules 输入框标题
    };
    // 命令名称 (新增)
    commands: {
        applyRules: string;
        addDot: string;
        removeDot: string;
    };
    // 右键菜单 (新增)
    menu: {
        hide: string;
        show: string;
        loading: string;
    };
    // 通知消息 (新增)
    notice: {
        hidden: string;
        shown: string;
        hideError: string;
        showError: string;
        noRules: string;
        noMatches: string;
        applied: (count: number) => string;
        reverted: (count: number) => string;
        applyError: (message: string) => string;
        listError: (message: string) => string;
        folder: string; // 用于区分文件和文件夹
        file: string;   // 用于区分文件和文件夹
        settingsErrorInit: string;
        statusHidden: (count: number) => string;
        statusNotHidden: string;
        loading: string;
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
        resetButton: 'Reset',
        allFilesButton: 'Add all files',
        rulesTitle: 'Rules',
    },
    commands: {
        applyRules: 'Apply ignore rules',
        addDot: 'Add dot prefix (Hide)',
        removeDot: 'Remove dot prefix (Show)',
    },
    menu: {
        hide: 'Hide',
        show: 'Show',
        loading: 'Loading...',
    },
    notice: {
        hidden: '{itemType} hidden',
        shown: '{itemType} shown',
        hideError: 'Failed to hide',
        showError: 'Failed to show',
        noRules: 'No valid rules',
        noMatches: 'No matching files found',
        applied: (count) => `Successfully hid ${count} items`,
        reverted: (count) => `Successfully shown ${count} items`,
        applyError: (message) => `Error applying rules: ${message}`,
        listError: (message) => `Failed to list directory contents: ${message}`,
        folder: 'Folder',
        file: 'File',
        settingsErrorInit: 'FileOperations not initialized',
        statusHidden: (count) => `${count} ${count === 1 ? 'item' : 'items'} matched and hidden`,
        statusNotHidden: 'No matched items are hidden',
        loading: 'Loading...',
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
        resetButton: '重置',
        allFilesButton: '添加所有文件',
        rulesTitle: '规则',
    },
    commands: {
        applyRules: '应用忽略规则',
        addDot: '添加点前缀（隐藏）',
        removeDot: '移除点前缀（显示）',
    },
    menu: {
        hide: '隐藏',
        show: '取消隐藏',
        loading: '加载中...',
    },
    notice: {
        hidden: '{itemType}已隐藏',
        shown: '{itemType}已显示',
        hideError: '隐藏失败',
        showError: '显示失败',
        noRules: '没有有效的规则',
        noMatches: '没有找到匹配的文件',
        applied: (count) => `成功隐藏 ${count} 个项目`,
        reverted: (count) => `成功显示 ${count} 个项目`,
        applyError: (message) => `应用规则时出错: ${message}`,
        listError: (message) => `列出目录内容失败: ${message}`,
        folder: '文件夹',
        file: '文件',
        settingsErrorInit: 'FileOperations 未初始化',
        statusHidden: (count) => `${count} 个匹配项已隐藏`,
        statusNotHidden: '没有匹配项被隐藏',
        loading: '加载中...',
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
        resetButton: '重置',
        allFilesButton: '添加所有文件',
        rulesTitle: '規則',
    },
    commands: {
        applyRules: '應用忽略規則',
        addDot: '添加點前綴（隱藏）',
        removeDot: '移除點前綴（顯示）',
    },
    menu: {
        hide: '隱藏',
        show: '取消隱藏',
        loading: '載入中...',
    },
    notice: {
        hidden: '{itemType}已隱藏',
        shown: '{itemType}已顯示',
        hideError: '隱藏失敗',
        showError: '顯示失敗',
        noRules: '沒有有效的規則',
        noMatches: '沒有找到符合的檔案',
        applied: (count) => `成功隱藏 ${count} 個項目`,
        reverted: (count) => `成功顯示 ${count} 個項目`,
        applyError: (message) => `應用規則時出錯: ${message}`,
        listError: (message) => `列出目錄內容失敗: ${message}`,
        folder: '資料夾',
        file: '檔案',
        settingsErrorInit: 'FileOperations 未初始化',
        statusHidden: (count) => `${count} 個符合項目已隱藏`,
        statusNotHidden: '沒有符合項目被隱藏',
        loading: '載入中...',
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
        resetButton: 'リセット',
        allFilesButton: 'すべてのファイルを追加',
        rulesTitle: 'ルール',
    },
    commands: {
        applyRules: '無視ルールを適用',
        addDot: 'ドット接頭辞を追加（隠す）',
        removeDot: 'ドット接頭辞を削除（表示）',
    },
    menu: {
        hide: '隠す',
        show: '表示',
        loading: '読み込み中...',
    },
    notice: {
        hidden: '{itemType}を隠しました',
        shown: '{itemType}を表示しました',
        hideError: '隠すのに失敗しました',
        showError: '表示に失敗しました',
        noRules: '有効なルールがありません',
        noMatches: '一致するファイルが見つかりません',
        applied: (count) => `正常に ${count} 個の項目を隠しました`,
        reverted: (count) => `正常に ${count} 個の項目を表示しました`,
        applyError: (message) => `ルール適用時にエラーが発生しました: ${message}`,
        listError: (message) => `ディレクトリ内容のリスト表示に失敗しました: ${message}`,
        folder: 'フォルダ',
        file: 'ファイル',
        settingsErrorInit: 'FileOperationsが初期化されていません',
        statusHidden: (count) => `${count} 個の一致項目が非表示です`,
        statusNotHidden: '一致する非表示項目はありません',
        loading: '読み込み中...',
    },
};

export const locales: Record<string, Translation> = {
    'en': en,
    'zh-CN': zhCN,
    'zh-TW': zhTW,
    'ja': ja,
};

export type LocaleKey = keyof typeof locales; 