# File Ignore review — 2026-10-21

## Directory status

The public [plugin page](https://community.obsidian.md/plugins/file-ignore)
remains available, but its Add to Obsidian button is disabled. The complete
[community plugin registry](https://github.com/obsidianmd/obsidian-releases/blob/master/community-plugins.json)
(blob `02d2324c7a595ea1304874a6145d3dcd62b49112`, inspected on this date)
contains neither `file-ignore` nor its repository. The removed and deprecated
lists also have no matching entry. These observations establish that it is absent
from the installation directory; they do not establish the moderation reason.

The page shows version 1.1.1 and 46 scan findings: 43 warnings plus three other
items (two unattested assets and one missing lockfile). It also reports no known
vulnerable dependencies and no detected obfuscation. The developer dashboard is
needed to establish any private review failure or reinstatement requirement.

[Obsidian's announcement](https://obsidian.md/blog/future-of-plugins/) explains
that releases are automatically reviewed and that failed reviews can remove a
plugin from search. Publishing a corrected GitHub release triggers another scan;
a successful GitHub release alone does not prove directory reinstatement.

## Findings and scope

| Area | Evidence and disposition |
| --- | --- |
| Release delivery | 1.1.2 exists only as a draft. The old tag workflow always created drafts and did not validate downloadable artifacts. 1.1.3 adds checked draft-to-public publication and public SHA-256 readback. |
| Official code warnings | Replaced direct DOM HTML with `setIcon`, HTML settings headings with `Setting`, direct Moment import with the bundled export, explicit `any` with narrowed types, and unhandled preview/open promises with rejection handlers. Manifest now has supported fields and punctuation. Removed unused build dependencies. |
| Confirmation | The old modal injected translations through `any` and never resolved its Promise when dismissed. Translation capture and `onClose` now cover this case; tests cover dismiss and Proceed. |
| Configuration directory | Hardcoded config protection did not honor a custom vault configuration directory. Use `Vault.configDir` and protect its children and ancestors from renaming while still scanning ordinary sibling folders. |
| Original dotfiles (#11) | Restore tracking was already in the 1.1.1 tag. It is retained and now tested through a restarted FileOperations instance. Existing dotfiles are not inferred to be plugin-owned. |
| Broken symlinks (#4) | Existing traversal uses `lstat` and does not follow directory symlinks. Regression test added. |
| Name collisions (#2/#3) | Existing checks run both when planning and when executing; tests cover a destination appearing after preview and rollback target conflicts. |
| Folder disappearance (#6) | The implementation renames a folder to a dot-prefixed hidden path. The historical report alone does not prove deletion or successful recovery. Test validates parent/child planning; no claim is made about that user's files. |
| Large vault hangs (#2/#7) | The unreleased 1.1.2 code prunes matched directories. Synchronous traversal still exists; responsiveness on arbitrary huge vaults is not established by these tests. |
| Repo interference (#3/#14) | This plugin performs real renames. Dependency/build tools and external links can be affected. A scanner or formatting change cannot make this a virtual exclusion API. |
| Mobile (#1) | Uses Node filesystem APIs and remains desktop only. |
| Profiles/automatic rules (#8) | Feature request, outside this maintenance release. |
| Website CSS | `style.css` is a standalone website stylesheet. The scorecard's duplicate-selector warnings there are distinct from the shipped plugin stylesheet `styles.css`. The release CSS gate checks the shipped stylesheet. |

## Release gate

`npm run release:check` runs official ESLint, the official Manifest rule, official
Stylelint configuration for plugin CSS, TypeScript, eight regression checks,
production build, bundle export loading, versions, changelog and required assets.
Warnings fail the gate. `npm run release:tag` reruns the gate and requires a clean
working tree before creating the version tag. CI repeats it on Linux, macOS and
Windows, then attests, verifies and publishes required attachments.

The declarative settings suggestion is intentionally disabled: this custom preview
UI supports Obsidian 1.8.7, while that new settings API requires 1.13. Other
recommended Obsidian rules remain enabled. Minimum app version is now 1.8.7.

Local tests mock the Obsidian API and use disposable temporary files. They do not
prove the actual desktop UI or automatic directory reinstatement. Latest-batch-only
recovery remains an existing limitation. Runtime dependency audit on this date
reported zero known vulnerabilities.
