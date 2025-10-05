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
        resetTooltip: string; // 重置按钮提示
        rulesTitle: string; // Rules 输入框标题
        rulesPlaceholder: string; // 规则输入框占位符
        searchButton: string; // 搜索按钮
        searchTooltip?: string; // 搜索按钮提示
        previousAppliedRuleTooltip?: string; // 新Tooltip
        nextAppliedRuleTooltip?: string; // 新Tooltip
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
        protectedSkipped?: (count: number) => string; // 新增: 受保护路径跳过提示
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
    // 确认对话框
    confirm?: {
        titleHide: string;
        titleShow: string;
        summaryHide: (count: number) => string;
        summaryShow: (count: number) => string;
        protectedWarning: (count: number) => string;
        proceed: string;
        cancel: string;
    };
    debugToggle?: {
        name: string;
        desc: string;
    };
    // 支持开发者
    support?: {
        name: string;
        desc: string;
        button: string;
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
        title: 'Ignore Rules',
        formatTitle: 'Rule format (one per line):',
        formats: [
            'File pattern: test.md',
            'Root path: /readme.md',
            'Directory: temp/',
            'Wildcard: *test/'
        ],
        noMatches: 'No matching files',
        matchedFiles: 'Matched Files',
        resetButton: 'Reset',
        resetTooltip: 'Restore default rules',
        rulesTitle: 'Rules',
        rulesPlaceholder: 'Enter rules, one per line',
        searchButton: 'Search',
        searchTooltip: 'Scan and display files matching the current rules',
        previousAppliedRuleTooltip: 'Previous applied rule',
        nextAppliedRuleTooltip: 'Next applied rule',
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
        protectedSkipped: (count) => `${count} protected item(s) skipped`,
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
    confirm: {
        titleHide: 'Confirm Hide',
        titleShow: 'Confirm Show',
        summaryHide: (count) => `Add a dot prefix to ${count} item(s).`,
        summaryShow: (count) => `Remove the dot prefix from ${count} item(s).`,
        protectedWarning: (count) => `${count} protected item(s) will be skipped`,
        proceed: 'Proceed',
        cancel: 'Cancel',
    },
    debugToggle: {
        name: 'Debug Logging',
        desc: 'Write detailed diagnostics to the developer console.',
    },
    support: {
        name: 'Support the Developer',
        desc: 'If you find this plugin helpful, consider supporting its development.',
        button: 'Buy Me a Coffee',
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
        resetTooltip: '恢复默认规则',
        rulesTitle: '规则',
        rulesPlaceholder: '输入规则，每行一个',
        searchButton: '搜索',
        searchTooltip: '扫描并显示匹配当前规则的文件',
        previousAppliedRuleTooltip: '上一个应用的规则',
        nextAppliedRuleTooltip: '下一个应用的规则',
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
        protectedSkipped: (count) => `已跳过 ${count} 个受保护路径`,
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
    confirm: {
        titleHide: '确认隐藏',
        titleShow: '确认显示',
        summaryHide: (count) => `将为 ${count} 个项目添加点前缀。`,
        summaryShow: (count) => `将为 ${count} 个项目移除点前缀。`,
        protectedWarning: (count) => `其中 ${count} 个受保护路径将被跳过`,
        proceed: '继续',
        cancel: '取消',
    },
    debugToggle: {
        name: '调试日志',
        desc: '将详细的诊断信息写入开发者控制台。',
    },
    support: {
        name: '支持开发者',
        desc: '如果您觉得这个插件有帮助，请考虑支持其开发。',
        button: '请我喝咖啡',
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
        resetTooltip: '恢復預設規則',
        rulesTitle: '規則',
        rulesPlaceholder: '輸入規則，每行一個',
        searchButton: '搜尋',
        searchTooltip: '掃描並顯示符合當前規則的檔案',
        previousAppliedRuleTooltip: '上一個套用的規則',
        nextAppliedRuleTooltip: '下一個套用的規則',
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
        protectedSkipped: (count) => `已跳過 ${count} 個受保護路徑`,
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
    confirm: {
        titleHide: '確認隱藏',
        titleShow: '確認顯示',
        summaryHide: (count) => `將為 ${count} 個項目新增點字首。`,
        summaryShow: (count) => `將為 ${count} 個項目移除點字首。`,
        protectedWarning: (count) => `其中 ${count} 個受保護路徑將被略過`,
        proceed: '繼續',
        cancel: '取消',
    },
    debugToggle: {
        name: '偵錯日誌',
        desc: '將詳細的診斷訊息寫入開發者控制台。',
    },
    support: {
        name: '支持開發者',
        desc: '如果您覺得這個外掛有幫助，請考慮支持其開發。',
        button: '請我喝咖啡',
    },
};

export const locales: Record<string, Translation> = {
    'en': en,
    'zh-CN': zhCN,
    'zh-TW': zhTW,
};

export type LocaleKey = keyof typeof locales; 
