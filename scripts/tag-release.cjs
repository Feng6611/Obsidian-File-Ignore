const { spawnSync } = require('node:child_process');
const path = require('node:path');
process.chdir(path.resolve(__dirname, '..'));
function run(command, args, capture = false) {
    const result = spawnSync(command, args, { encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit' });
    if (result.status !== 0) throw new Error(result.stderr || `${command} failed`);
    return result.stdout?.trim();
}
run(process.execPath, ['scripts/preflight.cjs']);
if (run('git', ['status', '--porcelain'], true)) throw new Error('Commit all release changes before tagging');
const version = require('../manifest.json').version;
run('git', ['tag', '-a', version, '-m', `Release ${version}`]);
console.log(`Created ${version}. Push the commit and tag to publish.`);
