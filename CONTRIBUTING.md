# Development and releases

Use Node.js 22 or newer and `npm ci`.

Run `npm run release:check` before committing a release. It runs the official
[Obsidian ESLint rules](https://github.com/obsidianmd/eslint-plugin), the official
[Obsidian Stylelint configuration](https://github.com/obsidianmd/stylelint-config),
TypeScript, filesystem regression tests, production bundling, and bundle loading.
Warnings fail the check. Manifest validation uses the official manifest rule.

The settings search suggestion is disabled because the custom preview UI supports
Obsidian 1.8.7 and the declarative settings API requires 1.13. No other recommended
Obsidian rule is disabled. `style.css` belongs to the standalone website;
`styles.css` is the plugin's stylesheet and the CSS release check target.

1. Update `package.json`, `manifest.json`, `versions.json`, and `CHANGELOG.md`.
2. Run `npm install --package-lock-only` to synchronize the lockfile.
3. Run `npm run release:check`, inspect the diff, and commit.
4. Run `npm run release:tag`. This reruns all checks and requires a clean tree
   before creating the exact version tag (without a `v` prefix).
5. Push the commit and tag. CI checks Linux, macOS and Windows, creates build
   attestations, validates draft attachments, publishes, and checks public downloads.
6. Confirm the workflow succeeded. To check again, check out the tag, run
   `npm ci && npm run build && npm run release:verify`.

For manual acceptance, use a disposable vault. Check Hide, Show, cancel/close the
rename confirmation, restart and Undo the last batch. Confirm original dotfiles
and the configured vault settings folder remain unchanged. These automated tests
use a mocked Obsidian API and do not prove behavior in the running desktop app.

File Ignore renames files and folders on disk. It can affect code repositories
and external links. Show only restores recorded names; it does not infer whether
an existing dotfile was hidden by an older plugin version. Keep a backup when
testing a vault. Recovery currently retains the latest batch.
