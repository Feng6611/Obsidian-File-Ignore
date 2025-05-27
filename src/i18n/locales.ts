export interface Translation {
    // 设置页面标题
    settingsTitle: string;
    // 新增：设置页面顶部操作提示
    settingsHeaderInfo?: string;
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
        rulesTitle: string; // 新增: Rules 输入框标题
        manualApplyButton?: string; // 新增：手动应用按钮标题
        manualApplyDesc?: string; // 新增：手动应用按钮描述
        undoButton?: string; // 新增
        redoButton?: string; // 新增
        previousAppliedRuleTooltip?: string; // 新Tooltip
        nextAppliedRuleTooltip?: string; // 新Tooltip
        recentRulesTitle?: string; // 此键不再用于UI，但可能保留以防未来需要
        loadButton?: string; // 此键不再用于UI
        noRecentRules?: string; // 此键不再用于UI
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
        unknownError: string; // 新增: 通用未知错误
        rollbackSuccess: string; // 新增: 回滚成功
        rollbackError: (message: string) => string; // 新增: 回滚失败
        noActionNeeded: string; // 新增: 无需操作
        rulesAppliedAndScanned?: string; // 新增：规则已应用并扫描通知
        ruleLoadedFromHistory?: string; // 新增
    };
    // 按钮文本 (新增)
    buttons?: {
        scanAndApply?: string;
    };
    // 新增：匹配文件列表下方的摘要信息
    matchedListSummary?: {
        itemsMatched: (count: number) => string;
        itemsHidden: (count: number) => string;
    };
}

export const en: Translation = {
    settingsTitle: 'File Ignore Settings',
    settingsHeaderInfo: "Click Hide/Show buttons to apply rules.",
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
        rulesTitle: 'Rules',
        manualApplyButton: "Apply Rules & Scan",
        manualApplyDesc: "Click to scan and display files matching the current rules.",
        previousAppliedRuleTooltip: "Previous applied rule",
        nextAppliedRuleTooltip: "Next applied rule",
        recentRulesTitle: "Recently Used Rules",
        loadButton: "Load",
        noRecentRules: "No recent rules yet.",
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
        statusHidden: (count) => `${count} ${count === 1 ? 'item' : 'items'} matched and would be hidden`,
        statusNotHidden: 'No matched items would be hidden',
        loading: 'Loading...',
        unknownError: 'An unknown error occurred.',
        rollbackSuccess: 'Rollback successful.',
        rollbackError: (message) => `Rollback failed: ${message}`,
        noActionNeeded: 'No files needed to be changed based on the current rules.',
        rulesAppliedAndScanned: "Rules applied and files scanned!",
        ruleLoadedFromHistory: "Rule loaded from history.",
    },
    buttons: {
        scanAndApply: "Scan and Apply Rules",
    },
    matchedListSummary: {
        itemsMatched: (count) => `${count} ${count === 1 ? 'item' : 'items'} matched`,
        itemsHidden: (count) => `${count} ${count === 1 ? 'item' : 'items'} hidden`,
    },
};

export const zhCN: Translation = {
    settingsTitle: 'File Ignore 设置',
    settingsHeaderInfo: '使用"隐藏/显示"按钮应用规则。匹配的文件将在右侧预览。',
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
        rulesTitle: '规则',
        manualApplyButton: "应用规则并扫描",
        manualApplyDesc: "点击以根据当前规则扫描并显示匹配的文件。",
        undoButton: "撤销",
        redoButton: "重做",
        previousAppliedRuleTooltip: "上一个应用的规则",
        nextAppliedRuleTooltip: "下一个应用的规则",
        recentRulesTitle: "最近使用的规则",
        loadButton: "加载",
        noRecentRules: "暂无最近规则。",
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
        statusHidden: (count) => `${count} 个匹配项将被隐藏`,
        statusNotHidden: '没有匹配项会被隐藏',
        loading: '加载中...',
        unknownError: '发生未知错误。',
        rollbackSuccess: '回滚成功。',
        rollbackError: (message) => `回滚失败: ${message}`,
        noActionNeeded: '根据当前规则，没有文件需要更改。',
        rulesAppliedAndScanned: "规则已应用且文件已扫描！",
        ruleLoadedFromHistory: "已从历史记录加载规则。",
    },
    buttons: {
        scanAndApply: "扫描并应用规则",
    },
    matchedListSummary: {
        itemsMatched: (count) => `共 ${count} 个项目匹配`,
        itemsHidden: (count) => `其中 ${count} 个项目已隐藏`,
    },
};

export const zhTW: Translation = {
    settingsTitle: 'File Ignore 設定',
    settingsHeaderInfo: "使用「隱藏/顯示」按鈕套用規則。符合的檔案將在右側預覽。",
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
            '檔案名稱：test.md',
            '根目錄：/readme.md',
            '資料夾：temp/',
            '萬用字元：*test/'
        ],
        noMatches: '無符合檔案',
        matchedFiles: '符合的檔案',
        resetButton: '重設',
        rulesTitle: '規則',
        manualApplyButton: "套用規則並掃描",
        manualApplyDesc: "點擊以根據當前規則掃描並顯示符合的檔案。",
        undoButton: "復原",
        redoButton: "重做",
        previousAppliedRuleTooltip: "上一個套用的規則",
        nextAppliedRuleTooltip: "下一個套用的規則",
        recentRulesTitle: "最近使用的規則",
        loadButton: "載入",
        noRecentRules: "暫無最近規則。",
    },
    commands: {
        applyRules: '套用忽略規則',
        addDot: '新增點前綴（隱藏）',
        removeDot: '移除點前缀（顯示）',
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
        noMatches: '找不到符合的檔案',
        applied: (count) => `成功隱藏 ${count} 個項目`,
        reverted: (count) => `成功顯示 ${count} 個項目`,
        applyError: (message) => `套用規則時發生錯誤: ${message}`,
        listError: (message) => `列出目錄內容失敗: ${message}`,
        folder: '資料夾',
        file: '檔案',
        settingsErrorInit: 'FileOperations 未初始化',
        statusHidden: (count) => `${count} 個符合項目將被隱藏`,
        statusNotHidden: '沒有符合項目會被隱藏',
        loading: '載入中...',
        unknownError: '發生未知錯誤。',
        rollbackSuccess: '還原成功。',
        rollbackError: (message) => `還原失敗: ${message}`,
        noActionNeeded: '根據目前規則，沒有檔案需要變更。',
        rulesAppliedAndScanned: "規則已套用且檔案已掃描！",
        ruleLoadedFromHistory: "已從歷史記錄載入規則。",
    },
    buttons: {
        scanAndApply: "掃描並套用規則",
    },
    matchedListSummary: {
        itemsMatched: (count) => `共 ${count} 個項目符合`,
        itemsHidden: (count) => `其中 ${count} 個項目已隱藏`,
    },
};

export const ja: Translation = {
    settingsTitle: 'File Ignore 設定',
    settingsHeaderInfo: "「表示/非表示」ボタンを使用してルールを適用します。一致したファイルは右側にプレビュー表示されます。",
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
        rulesTitle: 'ルール',
        manualApplyButton: "ルールを適用してスキャン",
        manualApplyDesc: "現在のルールに基づいてファイルをスキャンして表示するには、ここをクリックしてください。",
        undoButton: "元に戻す",
        redoButton: "やり直す",
        previousAppliedRuleTooltip: "前に適用されたルール",
        nextAppliedRuleTooltip: "次に適用されたルール",
        recentRulesTitle: "最近使用したルール",
        loadButton: "読み込む",
        noRecentRules: "最近使用したルールはありません。",
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
        hidden: '{itemType} が非表示になりました',
        shown: '{itemType} が表示されました',
        hideError: '非表示に失敗しました',
        showError: '表示に失敗しました',
        noRules: '有効なルールがありません',
        noMatches: '一致するファイルが見つかりません',
        applied: (count) => `${count} 個の項目を正常に非表示にしました`,
        reverted: (count) => `${count} 個の項目を正常に表示しました`,
        applyError: (message) => `ルールの適用中にエラーが発生しました: ${message}`,
        listError: (message) => `ディレクトリの内容の表示に失敗しました: ${message}`,
        folder: 'フォルダ',
        file: 'ファイル',
        settingsErrorInit: 'FileOperations が初期化されていません',
        statusHidden: (count) => `${count} 件の一致アイテムが非表示になります`,
        statusNotHidden: '一致するアイテムは非表示になりません',
        loading: '読み込み中...',
        unknownError: '不明なエラーが発生しました。',
        rollbackSuccess: 'ロールバックに成功しました。',
        rollbackError: (message) => `ロールバックに失敗しました: ${message}`,
        noActionNeeded: '現在のルールに基づき、変更が必要なファイルはありません。',
        rulesAppliedAndScanned: "ルールが適用され、ファイルがスキャンされました！",
        ruleLoadedFromHistory: "履歴からルールを読み込みました。",
    },
    buttons: {
        scanAndApply: "ルールを適用してスキャン",
    },
    matchedListSummary: {
        itemsMatched: (count) => `合計 ${count} 件のアイテムが一致`,
        itemsHidden: (count) => `うち ${count} 件のアイテムが非表示`,
    },
};

export const locales: Record<string, Translation> = {
    'en': en,
    'zh-CN': zhCN,
    'zh-TW': zhTW,
    'ja': ja,
};

export type LocaleKey = keyof typeof locales; 