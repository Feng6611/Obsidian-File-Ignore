# 📁 File Ignore

一个 Obsidian 插件，通过管理文件/文件夹的点 (.) 前缀（隐藏属性）来控制 Obsidian 的索引行为，提供类似 `.gitignore` 的文件过滤体验。

<p>
  <a href="https://community.obsidian.md/plugins/file-ignore"><img alt="下载量" src="https://img.shields.io/badge/downloads-4k%2B-7c3aed?logo=obsidian&logoColor=white&style=flat-square"></a>
  <a href="https://github.com/Feng6611/Obsidian-File-Ignore/releases/latest"><img alt="最新版本" src="https://img.shields.io/github/v/release/Feng6611/Obsidian-File-Ignore?label=release&color=7c3aed&style=flat-square"></a>
  <a href="https://github.com/Feng6611/Obsidian-File-Ignore/releases"><img alt="最近更新" src="https://img.shields.io/github/release-date/Feng6611/Obsidian-File-Ignore?label=updated&color=7c3aed&style=flat-square"></a>
</p>

[English](README.md) | 简体中文 · [官网](https://obsidian-file-ignore.kkuk.dev)

## 动机

- 我使用Next.js管理自己的blog，通过Obsidian写作并发布。但是 /node_modules 让我直接无语，Obsidian会全部索引他们，导致启动非常慢
- 借助OB默认不索引「.前缀隐藏文件」的特性，开发了一个通过修改文件名改变索引关系的插件
- 使用前插件前启动仓库大概10s，使用后秒开

### 相关场景 

当 Obsidian 库中包含大量非笔记文件（如代码仓库、附件、缓存）时

*   🐢 **启动缓慢，性能瓶颈**: Obsidian 尝试索引所有文件（包括 `node_modules`, `.git`, 大型附件目录），导致启动时间过长、内存 (RAM) 和 CPU 占用过高，操作卡顿。
*   🔍 **工作区混乱**: 全局搜索结果被 `node_modules` 等无关内容污染；图谱视图因大量非笔记文件而变得拥挤、难以解读。
*   ⚙️ **内置排除功能局限**: Obsidian 自带的"排除文件"选项往往无法真正阻止索引带来的性能问题，配置也不够便捷。


本插件利用 Obsidian 默认不索引"点前缀隐藏文件"的特性，允许您通过简单的 `.gitignore` 风格规则，为指定的文件或文件夹（如 `node_modules/`, `/dist/`, `temp/`）添加/移除点 (.) 前缀。

*   **添加点前缀 (隐藏)**：阻止 Obsidian 索引、搜索和显示这些文件/文件夹，从而 **提升性能**、**减少干扰**。
*   **移除点前缀 (显示)**：让文件/文件夹重新对 Obsidian 可见。


![Settings Page](setting.png)

## ⚡️ 使用方法

### 匹配规则 (Matching Rules)

支持以下匹配模式：

- 特定文件： `test.md`
- 根目录文件： `/readme.md`
- 整个文件夹： `temp/`
- 通配符匹配： `*test/` (例如 `/_build/`, `/cache*/`)

### 操作方式 (Operations)

在插件设置页面配置好规则后，您可以：

- 点击 **「隐藏文件 (Hide Files)」**：先生成重命名计划并预览，再为匹配规则的文件/文件夹添加「.」前缀。
- 点击 **「显示文件 (Show Files)」**：先生成重命名计划并预览，再移除匹配文件/文件夹的「.」前缀。
- 如果批处理中断，可以在设置页使用 **恢复** 操作，安全撤销已完成的部分。

### 如何配置？
在 Obsidian 的 `设置` -> `第三方插件` -> `File Ignore` 的设置页面中配置您的忽略规则。

## 🔍 使用技巧 (Tips)

推荐搭配 [Show-Hide-Files](https://github.com/polyipseity/obsidian-show-hidden-files) 插件使用，可以更方便地查看和管理被本插件隐藏的文件。

## 🔒 安全说明

- **重要：** File Ignore 的工作方式是直接重命名磁盘上的文件和文件夹，并不是真正的 Obsidian 原生排除 API。
- Hide/Show 在执行前会先生成重命名计划，并自动跳过 `.obsidian/`、`.git/`、`.trash/` 等受保护路径。
- 如果目标路径已存在，插件会跳过该项并记录审计日志，而不是覆盖已有文件。
- 当父目录已经在计划中时，子项会被自动跳过，避免对同一子树重复处理。
- 最新一次批处理会持久化保存；如果中途失败或中断，可以在设置页中撤销已完成部分。

## 🤝 支持与反馈 (Support & Feedback)

如果您在使用过程中遇到任何问题或有改进建议，欢迎访问我们的 [GitHub 仓库](https://github.com/Feng6611/Obsidian-File-Ignore) 提交 Issue

我是 [chenfeng](https://github.com/Feng6611)——除了 Obsidian 插件，我也做小而轻权限的 Mac 工具，比如修复 Cmd+Tab 不恢复最小化窗口的 [Command Reopen](https://commandreopen.com)。

您也可以通过给我买杯咖啡来支持我：[请我喝咖啡](https://buymeacoffee.com/kkuk)

## 📄 许可证 (License)

本项目采用 MIT 许可证开源 - 详见 [LICENSE](LICENSE) 文件。
