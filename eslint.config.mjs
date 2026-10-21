import { defineConfig } from 'eslint/config';
import obsidianmd from 'eslint-plugin-obsidianmd';

export default defineConfig([
    { ignores: ['main.js', 'scripts/**', 'tests/**', '*.config.mjs', 'version-bump.mjs'] },
    ...obsidianmd.configs.recommended,
    {
        files: ['src/**/*.ts'],
        // The custom preview UI supports Obsidian 1.8.7; declarative settings require 1.13.
        rules: { 'obsidianmd/settings-tab/prefer-setting-definitions': 'off' },
        languageOptions: {
            parserOptions: { project: './tsconfig.json', tsconfigRootDir: import.meta.dirname },
        },
    },
]);
