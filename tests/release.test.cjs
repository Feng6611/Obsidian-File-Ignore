const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const manifest = require('../manifest.json');
test('official manifest check rejects unknown fields and wrong types', t => {
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),'file-ignore-manifest-'));
    t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
    const check=path.resolve('scripts/check-manifest.mjs');
    for (const value of [{...manifest,main:'main.js'},{...manifest,isDesktopOnly:'yes'}]) {
        fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(value));
        const result=spawnSync(process.execPath,[check],{cwd:dir,encoding:'utf8'});
        assert.equal(result.status,1);
        assert.match(result.stderr,/obsidianmd\/validate-manifest/);
    }
    fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest));
    assert.equal(spawnSync(process.execPath,[check],{cwd:dir}).status,0);
});
test('release preflight rejects a tag/version mismatch before building', () => {
    const result=spawnSync(process.execPath,['scripts/preflight.cjs'],{env:{...process.env,GITHUB_REF_TYPE:'tag',GITHUB_REF_NAME:'0.0.0'},encoding:'utf8'});
    assert.equal(result.status,1);
    assert.match(result.stderr,/Tag must equal manifest version/);
});
