# 📁 File Ignore

一个 Obsidian 插件，通过管理文件的点前缀（隐藏属性）来控制文件索引，提供类似 .gitignore 的使用体验。

[English](README.md) | 简体中文

## 动机

- 我使用Next.js管理自己的blog，通过Obsidian写作并发布。但是 /node_modules 让我直接无语，Obsidian会全部索引他们，导致启动非常慢
- 借助OB默认不索引「.前缀隐藏文件」的特性，开发了一个通过修改文件名改变索引关系的插件
- 使用前插件前启动仓库大概10s，使用后秒开

[setting页面]!(setting.png)

## ⚡️ 使用方法

### 匹配规则

支持以下匹配模式：

- 具体文件：`test.md`
- 根目录文件：`/readme.md`
- 整个文件夹：`temp/`
- 通配符匹配：`*test/`

### 操作方式

插件提供两个核心功能：

- 「隐藏文件」：为匹配的文件添加「.」前缀，将其设为隐藏文件
- 「显示文件」：移除匹配文件的「.」前缀，恢复为普通文件

### 🔍 使用技巧

推荐搭配 [Show-Hide-Files](https://github.com/polyipseity/obsidian-show-hidden-files) 插件使用，可以更方便地查看和管理隐藏文件。

## 🤝 支持与反馈

如果你在使用过程中遇到任何问题或有改进建议，欢迎访问我们的 [GitHub 仓库](https://github.com/feng6611/file-ignore) 提出 issue。

## 📄 许可证

本项目采用 MIT 许可证开源 - 详见 [LICENSE](LICENSE) 文件。