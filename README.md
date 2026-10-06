# File Ignore

An Obsidian plugin that controls indexing by adding or removing dot prefixes on files and folders, providing a pattern-based ignore workflow for large vaults.

<p>
  <a href="https://community.obsidian.md/plugins/file-ignore"><img alt="Downloads" src="https://img.shields.io/badge/downloads-4k%2B-7c3aed?logo=obsidian&logoColor=white&style=flat-square"></a>
  <a href="https://github.com/Feng6611/Obsidian-File-Ignore/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/Feng6611/Obsidian-File-Ignore?label=release&color=7c3aed&style=flat-square"></a>
  <a href="https://github.com/Feng6611/Obsidian-File-Ignore/releases"><img alt="Last updated" src="https://img.shields.io/github/release-date/Feng6611/Obsidian-File-Ignore?label=updated&color=7c3aed&style=flat-square"></a>
</p>

English | [简体中文](README-zh.md) · [Website](https://obsidian-file-ignore.kkuk.dev)

> **File Ignore renames files and folders on disk.** Review the rename preview before applying changes.

## Motivation

I built File Ignore while using Obsidian to write in a Next.js blog repository. Indexing its `/node_modules` directory made the vault slow to open.

Because Obsidian skips dot-prefixed hidden files and folders during indexing, File Ignore lets you toggle dot prefixes on matching paths to exclude them from indexing while keeping them on disk.

### Common vault issues

When your vault contains code repositories, build artifacts, or large non-note directories:

- **Slow startup and indexing**: Obsidian attempts to index every file, resulting in slow launch times and high resource usage.
- **Cluttered search and graph**: Results in global search and nodes in graph view become overwhelmed with dependency files and build caches.
- **Built-in exclusion limits**: Obsidian's native "Excluded files" setting does not always prevent indexing overhead for massive folder trees.

---

![Settings Page](setting.png)

## Features

- **Rule-based filtering**: Define path patterns to identify files and folders to ignore.
- **Hide files**: Adds a leading dot (`.`) to matching paths, hiding them from Obsidian's index.
- **Show files**: Removes the leading dot prefix, restoring visibility in Obsidian.
- **Batch preview and plan**: Generates a rename plan and displays a preview before renaming paths on disk.
- **Safety checks and recovery**: Skips protected folders, aborts on name collisions, and includes a recovery action to undo interrupted batches.

## Usage

### Matching Rules

File Ignore supports basic path-matching patterns:

- Specific file: `test.md`
- Root directory file: `/readme.md`
- Entire folder: `temp/`
- Wildcard matching: `*test/` (e.g., `/_build/`, `/cache*/`)

*Note: Patterns are simple path rules, not full `.gitignore` specifications.*

### Operations

After configuring rules in the plugin settings:

1. Click **"Hide Files"**: Builds a rename plan, displays a preview, and adds a `.` prefix to matching files and folders.
2. Click **"Show Files"**: Builds a rename plan, displays a preview, and removes the `.` prefix from matching files and folders.
3. If a batch is interrupted, click **Recovery** in settings to safely revert already-renamed files.

### Configuration

Open Obsidian and navigate to **Settings → Community plugins → File Ignore** to configure ignore rules.

## Installation

1. Open **Settings → Community plugins** in Obsidian.
2. Turn **Restricted mode** off if prompted.
3. Click **Browse**.
4. Search for **File Ignore**.
5. Click **Install**, then click **Enable**.

## Tips

Pair File Ignore with the [Show-Hide-Files](https://github.com/polyipseity/obsidian-show-hidden-files) plugin if you need to view or manage dot-prefixed files directly inside Obsidian's file explorer.

## Safety and Limitations

- **Disk renaming**: File Ignore renames items on your filesystem. It is not an Obsidian internal filter or virtual exclude API.
- **Protected directories**: The plugin automatically skips critical directories, including `.obsidian/`, `.git/`, and `.trash/`.
- **Collision avoidance**: If a destination path already exists (for example, if both `foo.md` and `.foo.md` exist), the rename aborts and writes an audit log instead of overwriting existing data.
- **Hierarchy handling**: When a parent folder is scheduled for renaming, its child items are skipped to avoid redundant operations.
- **Undo and recovery**: The latest batch operation is saved to disk so interrupted operations can be rolled back from the settings page.
- **Audit trail**: Every rename records a `[file-ignore][audit]` entry in the developer console.

## Debugging and Troubleshooting

1. Open **Settings → Community plugins → File Ignore**.
2. Turn on **Debug logging**.
3. Open the developer console via **View → Toggle Developer Tools** and select the **Console** tab.
4. Review `[file-ignore][audit]` entries for batch details, skipped paths, and errors.
5. Turn off **Debug logging** when finished.

## Support

If you encounter issues or have suggestions, please open an issue on the [GitHub repository](https://github.com/Feng6611/Obsidian-File-Ignore).

Built by [chenfeng](https://github.com/Feng6611). Alongside Obsidian plugins, I develop focused Mac utilities, including [Command Reopen](https://commandreopen.com), which restores minimized windows on Cmd+Tab.

You can also support development on [Buy Me A Coffee](https://buymeacoffee.com/kkuk).

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
