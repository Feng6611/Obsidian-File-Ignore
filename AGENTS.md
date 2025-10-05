# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds TypeScript sources; core flow starts in `src/main.ts`, with file ops in `src/fileOperations.ts`, filesystem helpers in `src/localFileSystem.ts`, UI logic in `src/settings.ts`, and translations under `src/i18n/`.
- Build artifacts live at the repo root: `main.js` (bundle), `manifest.json` (Obsidian manifest), and optional `styles.css` for plugin styling.
- Tooling files include `esbuild.config.mjs` for bundling, `tsconfig.json` for compiler settings, `package.json` for scripts, and `versions.json` for release tracking. Docs and assets reside in `docs/` and images such as `setting.png`.

## Build, Test, and Development Commands
- `npm install` installs dependencies.
- `npm run dev` watches source changes and rebuilds `main.js` with inline sourcemaps for rapid testing.
- `npm run build` runs `tsc -noEmit` for type safety, then produces a production bundle.
- `npm run debug` launches the esbuild script with the Node inspector enabled.
- `npm run version` updates `manifest.json` and `versions.json`, staging the result.

## Coding Style & Naming Conventions
- Target TypeScript `es2018`; output uses CommonJS semantics.
- Use 4-space indentation, semicolons, and single-quoted strings; keep functions small and descriptive.
- Apply `camelCase` for variables/functions, `PascalCase` for classes, and file names in `camelCase`. Mirror existing patterns when extending modules.

## Testing Guidelines
- No automated tests; validate manually in an Obsidian dev vault.
- Copy or symlink `manifest.json`, `main.js`, and `styles.css` into `.obsidian/plugins/file-ignore/`, then reload plugins.
- In Obsidian, configure rules via Settings → Community plugins → File Ignore, run “Apply Ignore Rules”, toggle dot-prefix commands, and confirm rename rollback on disposable files.

## Commit & Pull Request Guidelines
- Write commits in concise imperative form (e.g., `Add rule parser`); group related changes and avoid unrelated cleanups.
- PRs should describe user-facing impact, link issues when available, include screenshots/GIFs for UI changes, list manual test steps, and note migrations or breaking behavior.

## Security & Configuration Tips
- Limit operations to safe renames that toggle leading dots; avoid destructive file I/O.
- Keep verbose logging behind `settings.debug` flags and scrub sensitive vault paths when sharing logs.
- `.gitignore`-style match rules support negations and directory suffix `/`; test edge cases before releasing.
