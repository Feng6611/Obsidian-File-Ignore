import { readFileSync } from 'node:fs';
import { Linter } from 'eslint';
import tseslint from 'typescript-eslint';
import obsidianmd from 'eslint-plugin-obsidianmd';
// Use the TypeScript parser's JSON mode: the official rule expects ESTree.
const messages = new Linter().verify(readFileSync('manifest.json', 'utf8'), [{
    files: ['**/manifest.json'],
    languageOptions: { parser: tseslint.parser },
    plugins: { obsidianmd },
    rules: { 'obsidianmd/validate-manifest': 'error' },
}], { filename: 'manifest.json' });
if (messages.length) {
    console.error(messages);
    process.exitCode = 1;
} else console.log('Official Obsidian manifest check passed');
