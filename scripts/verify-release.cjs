const { execFileSync } = require('node:child_process');
const { readFileSync, mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
process.chdir(path.resolve(__dirname, '..'));
const version = require('../manifest.json').version;
const repo = 'Feng6611/Obsidian-File-Ignore';
const info = JSON.parse(execFileSync('gh', ['release', 'view', version, '--repo', repo, '--json', 'isDraft,tagName,assets,url'], { encoding: 'utf8' }));
assert.equal(info.tagName, version);
if (!process.argv.includes('--draft')) assert.equal(info.isDraft, false, 'Release is still a draft');
const files = ['main.js', 'manifest.json', 'styles.css'];
for (const name of files) assert.ok(info.assets.some(asset => asset.name === name && asset.size > 0), `Missing asset ${name}`);
const dir = mkdtempSync(path.join(tmpdir(), 'file-ignore-release-'));
const hash = data => createHash('sha256').update(data).digest('hex');
(async () => {
    try {
        if (process.argv.includes('--draft')) {
            execFileSync('gh', ['release', 'download', version, '--repo', repo, '--dir', dir]);
            for (const name of files) assert.equal(hash(readFileSync(path.join(dir, name))), hash(readFileSync(name)), `${name} differs`);
        } else {
            for (const name of files) {
                const response = await fetch(`https://github.com/${repo}/releases/download/${version}/${name}`, { signal: AbortSignal.timeout(30000) });
                assert.equal(response.status, 200, `Public download failed: ${name}`);
                assert.equal(hash(Buffer.from(await response.arrayBuffer())), hash(readFileSync(name)), `${name} differs`);
            }
        }
        console.log(`Verified ${info.url}: required assets match local SHA-256`);
    } finally { rmSync(dir, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
