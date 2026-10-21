const { spawnSync } = require('node:child_process');
const { readFileSync, existsSync } = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const path = require('node:path');
process.chdir(path.resolve(__dirname, '..'));
const read = name => JSON.parse(readFileSync(name, 'utf8'));
const manifest = read('manifest.json');
const pkg = read('package.json');
assert.match(manifest.version, /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
assert.equal(pkg.version, manifest.version, 'package/manifest version mismatch');
assert.equal(read('versions.json')[manifest.version], manifest.minAppVersion, 'versions.json mismatch');
assert.equal(manifest.id, 'file-ignore');
assert.equal(manifest.isDesktopOnly, true, 'Node filesystem access requires desktop-only');
assert.ok(existsSync('package-lock.json'), 'Commit package-lock.json for reproducible builds');
assert.equal(read('package-lock.json').packages[''].version, pkg.version);
assert.ok(readFileSync('CHANGELOG.md', 'utf8').includes(`## ${manifest.version}\n`), 'Missing release notes');
if (process.env.GITHUB_REF_TYPE === 'tag') assert.equal(process.env.GITHUB_REF_NAME, manifest.version, 'Tag must equal manifest version (no v prefix)');
for (const name of ['lint', 'lint:css', 'typecheck', 'test', 'build']) {
    const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', name], { stdio: 'inherit', shell: process.platform === 'win32' });
    if (result.status !== 0) process.exit(result.status || 1);
}
const code = readFileSync('main.js', 'utf8');
assert.ok(code.length > 1000, 'Missing or empty bundle');
assert.ok(!code.includes('sourceMappingURL='), 'Production bundle must not include sourcemaps');
class Plugin {}
class PluginSettingTab {}
class Modal {}
const moduleObject = { exports: {} };
vm.runInNewContext(code, {
    module: moduleObject, exports: moduleObject.exports, process,
    require: id => id === 'obsidian' ? { Plugin, PluginSettingTab, Modal, debounce: fn => fn } : require(id),
}, { filename: 'main.js', timeout: 5000 });
assert.equal(typeof moduleObject.exports.default, 'function', 'Bundle must export an Obsidian plugin');
assert.ok(moduleObject.exports.default.prototype instanceof Plugin);
for (const name of ['main.js', 'manifest.json', 'styles.css']) assert.ok(readFileSync(name).length > 0, `Missing asset: ${name}`);
console.log(`Release preflight passed: ${manifest.version}`);
